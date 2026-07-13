import { describe, expect, it } from "vitest";
import { buildMarkdownReport } from "../../src/utils/export.js";
import type { StoredJob } from "../../src/types.js";

function makeJob(overrides: Partial<StoredJob> = {}): StoredJob {
  return {
    id: 42,
    portal: "Stepstone",
    title: "KI-Manager (m/w/d)",
    company: "Beispiel GmbH",
    location: "Frankfurt am Main",
    remoteOption: "Hybrid",
    url: "https://www.stepstone.de/job/123",
    postedAt: "",
    scrapedAt: "",
    status: "gefunden",
    score: 72,
    scoreReasoning: "Rollenpassung stark, CV-Match gut.",
    requirements: "",
    tasks: "",
    benefits: "",
    mustCriteria: [],
    niceToHaveCriteria: [],
    cvMatches: [],
    gaps: [],
    recommendation: "bewerben",
    notes: "",
    lastCheckedAt: "",
    description: "",
    scoreBreakdown: null,
    cvOptimizationSuggestions: [],
    coverLetterAngles: [],
    incomplete: false,
    ...overrides,
  };
}

describe("buildMarkdownReport", () => {
  it("führt die ID als erste Spalte der Übersichtstabelle", () => {
    const md = buildMarkdownReport([makeJob({ id: 42 })]);
    // Kopfzeile beginnt mit der ID-Spalte
    expect(md).toContain("| ID | Score |");
    // Datenzeile beginnt mit der ID des Jobs, gefolgt vom Score
    expect(md).toMatch(/\|\s*42\s*\|\s*72\s*\|/);
  });
});
