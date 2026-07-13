import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SEARCH_TERMS, loadConfig } from "../../src/config/config.js";

const MANAGED_KEYS = [
  "SEARCH_TERMS",
  "APPLICANT_FIRST_NAME",
  "APPLICANT_LAST_NAME",
  "APPLICANT_EMAIL",
  "APPLICANT_PHONE",
] as const;

describe("loadConfig", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of MANAGED_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of MANAGED_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  describe("Suchbegriffe", () => {
    it("nutzt gesetzte SEARCH_TERMS als kommaseparierte Liste", () => {
      process.env.SEARCH_TERMS = "KI Manager,AI Transformation Manager";
      expect(loadConfig().searchTerms).toEqual(["KI Manager", "AI Transformation Manager"]);
    });

    it("trimmt Leerzeichen um die Kommas und entfernt leere Einträge", () => {
      process.env.SEARCH_TERMS = "  KI Manager ,, AI Consultant ,  ";
      expect(loadConfig().searchTerms).toEqual(["KI Manager", "AI Consultant"]);
    });

    it("fällt bei fehlender Variable auf DEFAULT_SEARCH_TERMS zurück", () => {
      expect(loadConfig().searchTerms).toEqual(DEFAULT_SEARCH_TERMS);
    });

    it("fällt bei reinem Whitespace auf DEFAULT_SEARCH_TERMS zurück", () => {
      process.env.SEARCH_TERMS = "   ";
      expect(loadConfig().searchTerms).toEqual(DEFAULT_SEARCH_TERMS);
    });
  });

  describe("Bewerberdaten", () => {
    it("übernimmt gesetzte APPLICANT_*-Werte in config.applicant", () => {
      process.env.APPLICANT_FIRST_NAME = "Marius";
      process.env.APPLICANT_LAST_NAME = "Beispiel";
      process.env.APPLICANT_EMAIL = "marius@example.de";
      process.env.APPLICANT_PHONE = "+49 151 0000000";
      expect(loadConfig().applicant).toEqual({
        firstName: "Marius",
        lastName: "Beispiel",
        email: "marius@example.de",
        phone: "+49 151 0000000",
      });
    });

    it("liefert leere Strings, wenn keine APPLICANT_*-Werte gesetzt sind", () => {
      expect(loadConfig().applicant).toEqual({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
      });
    });
  });
});
