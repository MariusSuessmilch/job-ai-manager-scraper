import { describe, expect, it } from "vitest";
import { scoreJob, extractCriteria } from "../../src/scoring/score-job.js";
import type { CvProfile, JobDetails } from "../../src/types.js";

const baseProfile: CvProfile = {
  rawText:
    "Projektmanager mit 8 Jahren Berufserfahrung in Beratung und IT. Scrum, Stakeholder-Kommunikation, " +
    "Change Management, Prozessanalyse, Automatisierung mit n8n. Schulungen und Workshops. " +
    "Zertifizierter KI-Manager (IHK), 2025. Python Grundkenntnisse, Power BI.",
  sourceFile: "test.md",
  yearsOfExperience: 8,
  roles: ["Projektmanagement", "Beratung"],
  industries: ["Beratung"],
  hasLeadershipExperience: true,
  hasProjectManagementExperience: true,
  hasConsultingExperience: true,
  hasChangeManagementExperience: true,
  hasTrainingExperience: true,
  itSkills: ["Python", "BI / Datenanalyse"],
  aiSkills: ["LLM / Large Language Models", "Prompt Engineering", "KI-Schulungen"],
  certificates: ["Zertifizierter KI-Manager (IHK), 2025"],
  hasAiManagerCertificate: true,
  education: ["B.Sc. Wirtschaftsinformatik"],
  languages: ["Deutsch", "Englisch"],
  achievements: [],
};

function makeJob(overrides: Partial<JobDetails>): JobDetails {
  return {
    portal: "Stepstone",
    title: "KI Manager (m/w/d)",
    company: "Beispiel GmbH",
    location: "Frankfurt am Main",
    url: "https://www.stepstone.de/job/123",
    postedAt: "",
    description: "",
    requirements: "",
    tasks: "",
    benefits: "",
    remoteOption: "Hybrid",
    incomplete: false,
    ...overrides,
  };
}

const goodFitJob = makeJob({
  title: "KI Transformation Manager (m/w/d)",
  description:
    "Sie steuern die KI-Einführung in unserem Unternehmen, entwickeln die KI-Strategie weiter und " +
    "begleiten Change Management und Schulungen. Quereinstieg mit Berufserfahrung möglich. " +
    "Eine Weiterbildung oder ein Zertifikat im KI-Bereich wird akzeptiert. Hybrid in Frankfurt.",
  requirements:
    "Mehrjährige Berufserfahrung im Projektmanagement ist erforderlich. " +
    "Erfahrung mit Stakeholder-Kommunikation wird vorausgesetzt. " +
    "Kenntnisse in KI-Tools und Prompting sind wünschenswert. " +
    "Verständnis für Datenschutz und Governance von Vorteil.",
  tasks: "KI-Einführung, Prozessautomatisierung, Schulung der Mitarbeitenden, Stakeholder-Management.",
});

const mlEngineerJob = makeJob({
  title: "Senior Machine Learning Engineer (m/w/d)",
  description:
    "Sie entwickeln und trainieren ML-Modelle in Produktion. PyTorch, TensorFlow, MLOps. " +
    "Wir setzen 5+ Jahre Erfahrung in Machine Learning voraus. PhD erwünscht. Data Engineer Mindset.",
  requirements:
    "Fundierte Machine Learning Kenntnisse sind zwingend erforderlich. " +
    "Python Produktionserfahrung ist Voraussetzung. MLOps und Modelltraining erforderlich.",
});

const internshipJob = makeJob({
  title: "Praktikum KI Management",
  description: "Praktikum im Bereich KI für Studierende. Werkstudent willkommen.",
});

describe("scoreJob", () => {
  it("bewertet eine passende KI-Transformations-Stelle deutlich höher als eine ML-Engineer-Stelle", () => {
    const good = scoreJob(goodFitJob, baseProfile, { location: "", remote: "" });
    const bad = scoreJob(mlEngineerJob, baseProfile, { location: "", remote: "" });
    expect(good.score.score_total).toBeGreaterThan(bad.score.score_total + 20);
    expect(good.score.score_total).toBeGreaterThanOrEqual(70);
    expect(good.score.recommendation).toBe("bewerben");
  });

  it("stuft reine ML-Engineer-Rollen als nicht empfohlen ein", () => {
    const bad = scoreJob(mlEngineerJob, baseProfile, { location: "", remote: "" });
    expect(bad.score.score_total).toBeLessThan(55);
    expect(bad.score.recommendation).toBe("eher nicht bewerben");
    expect(bad.score.gaps.join(" ")).toMatch(/ML|Senior|zwingend/i);
  });

  it("straft Praktika und Werkstudentenstellen stark ab", () => {
    const result = scoreJob(internshipJob, baseProfile, { location: "", remote: "" });
    expect(result.score.score_breakdown.role_fit).toBeLessThanOrEqual(5);
  });

  it("bewertet Standort neutral (5/10), wenn keine Präferenz angegeben ist", () => {
    const result = scoreJob(goodFitJob, baseProfile, { location: "", remote: "" });
    expect(result.score.score_breakdown.location_fit).toBe(5);
    expect(result.score.reasoning).toContain("neutral bewertet");
  });

  it("belohnt passenden Standort und Hybrid-Präferenz", () => {
    const result = scoreJob(goodFitJob, baseProfile, { location: "Frankfurt", remote: "hybrid" });
    expect(result.score.score_breakdown.location_fit).toBeGreaterThanOrEqual(8);
  });

  it("liefert eine vollständige, begründete Score-Struktur", () => {
    const { score } = scoreJob(goodFitJob, baseProfile, { location: "", remote: "" });
    const sum = Object.values(score.score_breakdown).reduce((a, b) => a + b, 0);
    expect(score.score_total).toBe(sum);
    expect(score.reasoning).toMatch(/Rollenpassung/);
    expect(score.reasoning).toMatch(/CV-Match/);
    expect(score.strong_matches.length).toBeGreaterThan(0);
  });

  it("kennzeichnet unvollständig ausgelesene Anzeigen im Reasoning", () => {
    const incomplete = makeJob({ incomplete: true, description: "KI Manager Stelle" });
    const { score } = scoreJob(incomplete, baseProfile, { location: "", remote: "" });
    expect(score.reasoning).toContain("unvollständig");
  });

  it("erkennt semantisch passende Stellen auch ohne 'KI-Manager' im Titel", () => {
    const semanticJob = makeJob({
      title: "Manager Digitale Transformation & Künstliche Intelligenz",
      description:
        "Verantwortung für AI Adoption, KI-Strategie, Change Management und Schulungen. " +
        "Berufserfahrung im Projektmanagement wird anerkannt, Weiterbildung im KI-Bereich akzeptiert.",
    });
    const { score } = scoreJob(semanticJob, baseProfile, { location: "", remote: "" });
    expect(score.score_total).toBeGreaterThanOrEqual(60);
  });
});

describe("extractCriteria", () => {
  it("trennt Muss- und Kann-Kriterien", () => {
    const { must, nice } = extractCriteria(goodFitJob.requirements);
    expect(must.length).toBeGreaterThanOrEqual(2);
    expect(nice.length).toBeGreaterThanOrEqual(2);
    expect(must.join(" ")).toMatch(/erforderlich|vorausgesetzt/);
    expect(nice.join(" ")).toMatch(/wünschenswert|von Vorteil/i);
  });
});
