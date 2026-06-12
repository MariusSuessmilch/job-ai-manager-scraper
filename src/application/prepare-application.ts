import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import type { Page } from "playwright";
import type { CvProfile, StoredJob } from "../types.js";
import { CvMissingError } from "../cv/parse-cv.js";
import { logger } from "../utils/logger.js";

/**
 * Bewerbungsunterstützung – bewusst defensiv:
 *  - bereitet Unterlagen und Formularfelder nur VOR
 *  - sendet NIEMALS ohne ausdrückliche, interaktive Bestätigung des Nutzers
 *  - verlangt einen vorhandenen Lebenslauf
 */

/** Erstellt ein Bewerbungs-Dossier (Markdown) als Vorbereitung – versendet nichts. */
export function prepareApplicationDossier(job: StoredJob, profile: CvProfile, exportDir: string): string {
  if (!profile.rawText) throw new CvMissingError();
  mkdirSync(exportDir, { recursive: true });
  const file = path.join(exportDir, `bewerbung-vorbereitung-job-${job.id}.md`);
  const lines = [
    `# Bewerbungsvorbereitung: ${job.title} – ${job.company}`,
    "",
    `- URL: ${job.url}`,
    `- Score: ${job.score ?? "noch nicht bewertet"}${job.score !== null ? "/100" : ""} (${job.recommendation || "–"})`,
    `- Status: ${job.status}`,
    "",
    "## Stärken für das Anschreiben",
    ...(job.coverLetterAngles.length ? job.coverLetterAngles.map((a) => `- ${a}`) : ["- (noch keine Bewertung vorhanden)"]),
    "",
    "## Lücken, die adressiert werden sollten",
    ...(job.gaps.length ? job.gaps.map((g) => `- ${g}`) : ["- keine erkannt"]),
    "",
    "## CV-Optimierung für diese Stelle",
    "(Nur Umgewichtung/Formulierung vorhandener Erfahrungen – keine erfundenen Inhalte.)",
    ...(job.cvOptimizationSuggestions.length ? job.cvOptimizationSuggestions.map((s) => `- ${s}`) : ["- keine Vorschläge"]),
    "",
    "## Wichtig",
    "Diese Datei ist eine Vorbereitung. Die Bewerbung wird erst nach deiner ausdrücklichen Bestätigung abgeschickt – niemals automatisch.",
    "",
  ];
  writeFileSync(file, lines.join("\n"), "utf-8");
  logger.info(`Bewerbungs-Dossier erstellt: ${file}`);
  return file;
}

export interface ApplicantData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

/**
 * Füllt erkennbare Felder eines Bewerbungsformulars aus – ohne abzusenden.
 * Gibt zurück, welche Felder befüllt werden konnten.
 */
export async function prefillApplicationForm(page: Page, applicant: ApplicantData): Promise<string[]> {
  const filled: string[] = [];
  const fieldMap: { label: string; selectors: string[]; value: string | undefined }[] = [
    { label: "Vorname", selectors: ['input[name*="first" i]', 'input[id*="vorname" i]'], value: applicant.firstName },
    { label: "Nachname", selectors: ['input[name*="last" i]', 'input[id*="nachname" i]'], value: applicant.lastName },
    { label: "E-Mail", selectors: ['input[type="email"]', 'input[name*="mail" i]'], value: applicant.email },
    { label: "Telefon", selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[name*="telefon" i]'], value: applicant.phone },
  ];
  for (const field of fieldMap) {
    if (!field.value) continue;
    for (const s of field.selectors) {
      const loc = page.locator(s).first();
      if (await loc.isVisible().catch(() => false)) {
        await loc.fill(field.value).catch(() => null);
        filled.push(field.label);
        break;
      }
    }
  }
  logger.info(`Formular vorbereitet (NICHT abgesendet). Befüllte Felder: ${filled.join(", ") || "keine"}`);
  return filled;
}

/**
 * Sendet eine vorbereitete Bewerbung NUR nach ausdrücklicher interaktiver
 * Bestätigung. Ohne wortwörtliches "JA SENDEN" wird abgebrochen.
 */
export async function submitApplicationWithConfirmation(page: Page, submitSelector: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    'Bewerbung wirklich absenden? Tippe exakt "JA SENDEN" zum Bestätigen (alles andere bricht ab): ',
  );
  rl.close();
  if (answer.trim() !== "JA SENDEN") {
    logger.info("Versand abgebrochen – keine Bewerbung abgesendet.");
    return false;
  }
  await page.locator(submitSelector).first().click();
  logger.info("Bewerbung nach ausdrücklicher Bestätigung abgesendet.");
  return true;
}
