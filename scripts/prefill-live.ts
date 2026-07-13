/**
 * Live-Demo der Bewerbungsvorbereitung:
 * Öffnet den höchstbewerteten Job aus der Datenbank im Browser, klickt auf
 * "Bewerben", füllt erkennbare Formularfelder vor – und sendet NICHTS ab.
 * Der Browser bleibt anschließend offen, damit der Nutzer prüfen kann.
 */
import { loadConfig } from "../src/config/config.js";
import { parseCv, CvMissingError } from "../src/cv/parse-cv.js";
import { openDatabase } from "../src/storage/sqlite.js";
import { JobRepository } from "../src/storage/job-repository.js";
import { PlaywrightClient } from "../src/browser/playwright-client.js";
import { prefillApplicationForm, prepareApplicationDossier } from "../src/application/prepare-application.js";
import { stepstoneSelectors as sel } from "../src/portals/stepstone/stepstone.selectors.js";
import { logger } from "../src/utils/logger.js";
import type { CvProfile, StoredJob } from "../src/types.js";
import type { Page } from "playwright";

const REVIEW_MINUTES = 10;

const APPLY_BUTTON_CANDIDATES = [
  '[data-at="apply-button"]',
  '[data-testid="harmonised-apply-button"]',
  'button:has-text("Jetzt bewerben")',
  'a:has-text("Jetzt bewerben")',
  'button:has-text("Bewerben")',
  'a:has-text("Bewerben")',
];

async function clickFirst(page: Page, selectors: string[]): Promise<boolean> {
  for (const s of selectors) {
    const loc = page.locator(s).first();
    if (await loc.isVisible().catch(() => false)) {
      await loc.click().catch(() => null);
      return true;
    }
  }
  return false;
}

/** Lädt den Lebenslauf oder bricht mit einem freundlichen Hinweis ab (analog zu src/index.ts). */
async function loadCvOrExit(cvPath: string): Promise<CvProfile> {
  try {
    return await parseCv(cvPath);
  } catch (err) {
    if (err instanceof CvMissingError) {
      console.error(`\n${err.message}\n`);
      console.error(
        "Führe `npm run setup` aus oder setze CV_FILE_PATH in der .env auf deine Lebenslauf-Datei (PDF, DOCX, MD oder TXT).",
      );
      process.exit(1);
    }
    throw err;
  }
}

const config = loadConfig();
const profile = await loadCvOrExit(process.env.CV_FILE_PATH || config.CV_FILE_PATH);
const repo = new JobRepository(openDatabase(config.DATABASE_URL));

// Optionales Argument --job <id>: konkreten Job statt des Top-Jobs öffnen.
const args = process.argv.slice(2);
const jobFlagIndex = args.indexOf("--job");
let top: StoredJob | undefined;
if (jobFlagIndex !== -1) {
  const raw = args[jobFlagIndex + 1];
  const jobId = Number(raw);
  if (!raw || !Number.isInteger(jobId)) {
    console.error("Ungültige Job-ID nach --job. Erwartet eine ganze Zahl, z. B. --job 42.");
    process.exit(1);
  }
  top = repo.listAll().find((j) => j.id === jobId);
  if (!top) {
    console.error(
      `Kein Job mit ID ${jobId} gefunden. Verfügbare IDs zeigt \`npm run report\` oder der Web-Hub (\`npm run web\`).`,
    );
    process.exit(1);
  }
} else {
  top = repo.listAll().filter((j) => j.score !== null)[0];
  if (!top) {
    console.error("Keine bewerteten Jobs in der Datenbank. Zuerst `npm run scrape` ausführen.");
    process.exit(1);
  }
}
logger.info(`Job (${top.score}/100): ${top.title} – ${top.company}`);
logger.info(`URL: ${top.url}`);

// 1. Dossier als Vorbereitung erzeugen
prepareApplicationDossier(top, profile, "./data/exports");

// 2. Browser öffnen (sichtbar) und zur Anzeige navigieren
const client = new PlaywrightClient({ headless: false, requestDelayMs: config.REQUEST_DELAY_MS });
await client.start();
const page = await client.newPage();

if (!(await client.isAllowedByRobots(top.url))) {
  console.error("robots.txt verbietet diese URL – Abbruch.");
  await client.close();
  process.exit(2);
}
await client.politeGoto(page, top.url);
await clickFirst(page, sel.cookieAccept);
await page.waitForTimeout(1000);

// 3. Bewerben-Button klicken (kann neuen Tab oder Login-Maske öffnen)
const popupPromise = page.waitForEvent("popup", { timeout: 8000 }).catch(() => null);
const clicked = await clickFirst(page, APPLY_BUTTON_CANDIDATES);
logger.info(clicked ? "Bewerben-Button geklickt." : "Kein Bewerben-Button gefunden.");
const popup = await popupPromise;
const formPage = popup ?? page;
await formPage.waitForLoadState("domcontentloaded").catch(() => null);
await formPage.waitForTimeout(3000);
logger.info(`Aktuelle Formular-Seite: ${formPage.url()}`);

// Login-Wand erkennen und ehrlich melden
const loginWall = await formPage
  .locator(
    'input[type="password"], [data-at="login-form"], form[action*="login" i], ' +
      ':text("Anmelden oder Registrieren"), [data-testid*="login" i]',
  )
  .first()
  .isVisible()
  .catch(() => false);
if (loginWall) {
  logger.warn("Stepstone verlangt einen Login, bevor das Bewerbungsformular erreichbar ist.");
}

// 4. Felder vorbereiten – NIEMALS absenden
// Eigene Bewerberdaten aus der .env verwenden, sonst Demodaten (mit Warnung).
const useOwnData = Boolean(config.applicant.firstName && config.applicant.email);
const applicant = useOwnData
  ? config.applicant
  : { firstName: "Jonas", lastName: "Berger", email: "jonas.berger@example.de", phone: "+49 170 1234567" };
if (!useOwnData) {
  logger.warn("Demodaten aktiv — APPLICANT_* in .env setzen für eigene Daten.");
}
const filled = await prefillApplicationForm(formPage, applicant);

await formPage.screenshot({ path: "./data/exports/bewerbung-formular.png", fullPage: false });
logger.info("Screenshot gespeichert: data/exports/bewerbung-formular.png");
console.log(
  JSON.stringify({ url: formPage.url(), loginWall, befuellteFelder: filled, abgesendet: false }, null, 2),
);

logger.info(`Browser bleibt ${REVIEW_MINUTES} Minuten zur Prüfung offen. Es wird nichts abgesendet.`);
await formPage.waitForTimeout(REVIEW_MINUTES * 60_000);
await client.close();
