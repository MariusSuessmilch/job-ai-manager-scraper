import { describe, expect, it } from "vitest";
import { buildCvProfile, estimateYearsOfExperience } from "../../src/cv/cv-profile.js";

const sampleCv = `
Max Mustermann
Projektmanager Digitalisierung

PROFIL
Projektmanager mit über 7 Jahren Erfahrung in IT-Beratung und Change Management.
Stakeholder-Kommunikation, Schulungen und Workshops, Prozessanalyse, Automatisierung mit n8n.

BERUFSERFAHRUNG
Projektmanager Digitalisierung	06/2020 – heute
Beispiel Consulting GmbH, Frankfurt
• Leitung von Digitalisierungsprojekten, Budgetverantwortung bis 300.000 €
• Ergebnis: Reduktion der Durchlaufzeit um 30 %

Consultant	09/2017 – 05/2020
DataWorks AG
• Datenanalysen mit Python, SQL und Power BI

ZERTIFIKATE
• Zertifizierter KI-Manager (IHK), 2025
• Professional Scrum Master I (Scrum.org), 2021

SPRACHEN
Deutsch (Muttersprache) | Englisch (C1)
`;

describe("buildCvProfile", () => {
  const profile = buildCvProfile(sampleCv, "test.md");

  it("erkennt das KI-Manager-Zertifikat (IHK)", () => {
    expect(profile.hasAiManagerCertificate).toBe(true);
    expect(profile.certificates.some((c) => /IHK/.test(c))).toBe(true);
  });

  it("erkennt Projektmanagement-, Beratungs- und Change-Erfahrung", () => {
    expect(profile.hasProjectManagementExperience).toBe(true);
    expect(profile.hasConsultingExperience).toBe(true);
    expect(profile.hasChangeManagementExperience).toBe(true);
    expect(profile.hasLeadershipExperience).toBe(true);
    expect(profile.hasTrainingExperience).toBe(true);
  });

  it("erkennt IT-Skills und Sprachen", () => {
    expect(profile.itSkills).toContain("Python");
    expect(profile.languages).toEqual(expect.arrayContaining(["Deutsch", "Englisch"]));
  });

  it("schätzt Berufsjahre aus Zeiträumen", () => {
    expect(profile.yearsOfExperience).toBeGreaterThanOrEqual(7);
  });

  it("extrahiert Erfolge mit messbarer Wirkung", () => {
    expect(profile.achievements.some((a) => a.includes("30"))).toBe(true);
  });
});

describe("estimateYearsOfExperience", () => {
  it("summiert mehrere Zeiträume", () => {
    const years = estimateYearsOfExperience(
      "01/2018 – 12/2020 Rolle A\n01/2021 – heute Rolle B",
      new Date(2026, 0),
    );
    expect(years).toBe(8);
  });

  it("liefert null ohne erkennbare Angaben", () => {
    expect(estimateYearsOfExperience("Kein Datum vorhanden")).toBeNull();
  });
});
