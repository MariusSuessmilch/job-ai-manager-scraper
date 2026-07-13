import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import type { CvProfile } from "../types.js";
import { buildCvProfile } from "./cv-profile.js";
import { logger } from "../utils/logger.js";

export const CV_MISSING_MESSAGE =
  "Bitte lade zuerst deinen Lebenslauf hoch oder gib ihn als Text ein. " +
  "Ohne Lebenslauf kann der Job-Fit-Score nicht sinnvoll berechnet werden.";

export class CvMissingError extends Error {
  constructor(detail?: string) {
    super(detail ? `${CV_MISSING_MESSAGE} (${detail})` : CV_MISSING_MESSAGE);
    this.name = "CvMissingError";
  }
}

/** Liest einen Lebenslauf (PDF, DOCX, Markdown, Plain Text) und extrahiert den Volltext. */
export async function extractCvText(filePath: string): Promise<string> {
  if (!filePath) throw new CvMissingError("CV_FILE_PATH ist nicht gesetzt");
  if (!existsSync(filePath)) throw new CvMissingError(`Datei nicht gefunden: ${filePath}`);

  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".docx": {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    case ".pdf": {
      // pdf-parse ist CommonJS; dynamischer Import des inneren Moduls vermeidet
      // den Debug-Code in dessen index.js.
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const buffer = await readFile(filePath);
      const result = await pdfParse(buffer);
      return result.text;
    }
    case ".md":
    case ".markdown":
    case ".txt":
      return readFile(filePath, "utf-8");
    default:
      throw new CvMissingError(`Nicht unterstütztes Format: ${ext} (erlaubt: PDF, DOCX, MD, TXT)`);
  }
}

/** Liest und strukturiert den Lebenslauf des Nutzers. */
export async function parseCv(filePath: string): Promise<CvProfile> {
  const text = await extractCvText(filePath);
  if (text.trim().length < 100) {
    throw new CvMissingError("Der Lebenslauf konnte nicht sinnvoll ausgelesen werden (zu wenig Text)");
  }
  const profile = buildCvProfile(text, filePath);
  logger.info(
    `Lebenslauf geladen: ${path.basename(filePath)} ` +
      `(~${profile.yearsOfExperience ?? "?"} Jahre Erfahrung, ` +
      `KI-Zertifikat erkannt: ${profile.hasAiManagerCertificate ? "ja" : "nein – als offene Information markiert"})`,
  );
  return profile;
}
