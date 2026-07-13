/**
 * Interaktiver Setup-Wizard: fragt die wichtigsten Einstellungen ab und
 * schreibt daraus eine `.env` auf Basis von `.env.example`. Legt außerdem den
 * `cv/`-Ordner an. Es werden keine Formulare abgesendet – reine Konfiguration.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SEARCH_TERMS } from "../src/config/config.js";

/**
 * Erzeugt einen `.env`-Inhalt aus einem Template: In Zeilen der Form `KEY=...`
 * wird der Wert ersetzt, sofern `values[KEY]` definiert ist (leere Strings
 * eingeschlossen). Kommentare und Reihenfolge bleiben erhalten; Keys aus
 * `values`, die im Template nicht vorkommen, werden ans Ende angehängt.
 */
export function renderEnv(template: string, values: Record<string, string>): string {
  const applied = new Set<string>();
  const lines = template.split("\n").map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (match && values[match[1]] !== undefined) {
      applied.add(match[1]);
      return `${match[1]}=${values[match[1]]}`;
    }
    return line;
  });
  let result = lines.join("\n");
  const extras = Object.keys(values).filter((key) => !applied.has(key));
  if (extras.length > 0) {
    const block = extras.map((key) => `${key}=${values[key]}`).join("\n");
    result = result.endsWith("\n") ? `${result}${block}\n` : `${result}\n${block}\n`;
  }
  return result;
}

type Prompt = (question: string) => Promise<string>;

async function askNumber(ask: Prompt, label: string, fallback: number): Promise<string> {
  for (;;) {
    const answer = (await ask(`${label} [${fallback}]: `)).trim();
    if (answer === "") return String(fallback);
    if (/^\d+$/.test(answer)) return answer;
    console.log("Bitte eine ganze Zahl eingeben (oder Enter für den Standardwert).");
  }
}

async function askRemote(ask: Prompt): Promise<string> {
  for (;;) {
    const answer = (await ask("Remote-Präferenz – remote/hybrid/onsite (Enter = keine Präferenz): "))
      .trim()
      .toLowerCase();
    if (answer === "" || answer === "remote" || answer === "hybrid" || answer === "onsite") return answer;
    console.log("Bitte remote, hybrid, onsite oder Enter für keine Präferenz.");
  }
}

async function runSetup(): Promise<void> {
  const projectRoot = fileURLToPath(new URL("..", import.meta.url));
  const envPath = join(projectRoot, ".env");
  const templatePath = join(projectRoot, ".env.example");

  const rl = createInterface({ input: stdin, output: stdout });
  const ask: Prompt = (question) => rl.question(question);

  try {
    console.log("job-ai-manager-scraper – Einrichtung. Enter übernimmt jeweils den Standard.\n");

    if (existsSync(envPath)) {
      const answer = (await ask(".env existiert bereits – überschreiben? (ja/nein): ")).trim().toLowerCase();
      if (answer !== "ja" && answer !== "j") {
        console.log("Abbruch – .env wurde nicht verändert.");
        return;
      }
    }

    const values: Record<string, string> = {};

    // Lebenslauf
    const cvPath = (
      await ask("Pfad zum Lebenslauf (PDF/DOCX/MD/TXT), z. B. ./cv/lebenslauf.pdf (Enter = später): ")
    ).trim();
    if (cvPath && !existsSync(cvPath)) {
      console.log(`Hinweis: Datei nicht gefunden (${cvPath}). Pfad wird trotzdem gesetzt – lege die Datei später an.`);
    }
    values.CV_FILE_PATH = cvPath;

    // Suchpräferenzen
    values.DEFAULT_LOCATION = (await ask("Standort/Stadt (Enter = leer): ")).trim();
    values.DEFAULT_RADIUS_KM = await askNumber(ask, "Umkreis in km", 50);
    values.REMOTE_PREFERENCE = await askRemote(ask);

    // Suchbegriffe (Enter = Standardliste, d. h. SEARCH_TERMS bleibt leer)
    console.log(`Standard-Suchbegriffe: ${DEFAULT_SEARCH_TERMS.join(", ")}`);
    values.SEARCH_TERMS = (
      await ask("Eigene Suchbegriffe, kommasepariert (Enter = Standardliste): ")
    ).trim();

    // Bewerberdaten (nur lokal, niemals automatisch versendet)
    console.log("\nBewerberdaten (nur lokal fürs Vorbefüllen von Formularen, werden nie automatisch versendet):");
    values.APPLICANT_FIRST_NAME = (await ask("Vorname (Enter = leer): ")).trim();
    values.APPLICANT_LAST_NAME = (await ask("Nachname (Enter = leer): ")).trim();
    values.APPLICANT_EMAIL = (await ask("E-Mail (Enter = leer): ")).trim();
    values.APPLICANT_PHONE = (await ask("Telefon (Enter = leer): ")).trim();

    // Scoring
    values.OPENAI_API_KEY = (
      await ask("\nOpenAI-API-Key (Enter = leer = regelbasiertes Scoring): ")
    ).trim();

    // .env schreiben
    const template = readFileSync(templatePath, "utf8");
    writeFileSync(envPath, renderEnv(template, values), "utf8");
    console.log("\n.env geschrieben.");

    // cv/-Ordner anlegen
    const cvDir = join(projectRoot, "cv");
    if (!existsSync(cvDir)) {
      mkdirSync(cvDir, { recursive: true });
      writeFileSync(
        join(cvDir, "LIES-MICH.md"),
        "Lege hier deinen eigenen Lebenslauf ab (PDF/DOCX/MD/TXT). Dieser Ordner ist über .gitignore ausgeschlossen und wird nicht committet.\n",
        "utf8",
      );
      console.log("Ordner ./cv/ angelegt (mit LIES-MICH.md).");
    }

    console.log("\nFertig. Nächster Schritt: `npm run scrape`.");
  } finally {
    rl.close();
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  await runSetup();
}
