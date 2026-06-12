import { describe, expect, it } from "vitest";
import { buildSearchUrl, detectRemoteOption, parseJobSections } from "../../src/portals/stepstone/stepstone.parser.js";
import { parseRobots } from "../../src/browser/playwright-client.js";

describe("parseJobSections", () => {
  it("zerlegt eine Anzeige in Aufgaben, Anforderungen und Benefits", () => {
    const text = [
      "KI Manager (m/w/d)",
      "Deine Aufgaben",
      "KI-Strategie entwickeln",
      "Schulungen durchführen",
      "Dein Profil",
      "Mehrjährige Berufserfahrung erforderlich",
      "Wir bieten",
      "30 Tage Urlaub",
    ].join("\n");
    const sections = parseJobSections(text);
    expect(sections.tasks).toContain("KI-Strategie");
    expect(sections.requirements).toContain("Berufserfahrung");
    expect(sections.benefits).toContain("Urlaub");
  });
});

describe("detectRemoteOption", () => {
  it("erkennt Remote, Hybrid und Home-Office", () => {
    expect(detectRemoteOption("Arbeite 100% remote")).toBe("Remote");
    expect(detectRemoteOption("Hybrides Arbeiten möglich")).toBe("Hybrid");
    expect(detectRemoteOption("2 Tage Home-Office pro Woche")).toBe("Hybrid/Home-Office möglich");
    expect(detectRemoteOption("Vor Ort in Frankfurt")).toBe("");
  });
});

describe("buildSearchUrl", () => {
  it("baut URL mit Umlaut-Slug, Standort und Radius", () => {
    const url = buildSearchUrl("https://www.stepstone.de", "KI Manager", "München", 50);
    expect(url).toBe("https://www.stepstone.de/jobs/ki-manager/in-muenchen?radius=50");
  });

  it("baut URL ohne Standort", () => {
    expect(buildSearchUrl("https://www.stepstone.de", "AI Governance Manager")).toBe(
      "https://www.stepstone.de/jobs/ai-governance-manager",
    );
  });
});

describe("parseRobots", () => {
  it("liest Disallow-Regeln für User-agent *", () => {
    const robots = ["User-agent: Googlebot", "Disallow: /privat", "", "User-agent: *", "Disallow: /api", "Disallow: /intern"].join("\n");
    expect(parseRobots(robots)).toEqual(["/api", "/intern"]);
  });
});
