import { describe, expect, it } from "vitest";
import { renderEnv } from "../../scripts/setup.js";

const TEMPLATE = `# Kommentar oben
OPENAI_API_KEY=
DEFAULT_LOCATION=
DEFAULT_RADIUS_KM=50

# Suchbegriffe
SEARCH_TERMS=
`;

describe("renderEnv", () => {
  it("ersetzt den Wert einer bekannten Schlüsselzeile", () => {
    const result = renderEnv(TEMPLATE, { DEFAULT_LOCATION: "München" });
    expect(result).toContain("DEFAULT_LOCATION=München");
  });

  it("lässt Kommentare und Reihenfolge unverändert", () => {
    const result = renderEnv(TEMPLATE, { DEFAULT_RADIUS_KM: "30" });
    const lines = result.split("\n");
    expect(lines[0]).toBe("# Kommentar oben");
    expect(lines[1]).toBe("OPENAI_API_KEY=");
    expect(lines[2]).toBe("DEFAULT_LOCATION=");
    expect(lines[3]).toBe("DEFAULT_RADIUS_KM=30");
    expect(lines[4]).toBe("");
    expect(lines[5]).toBe("# Suchbegriffe");
  });

  it("erlaubt leere Werte (Zeile bleibt KEY=)", () => {
    const result = renderEnv(TEMPLATE, { DEFAULT_RADIUS_KM: "" });
    expect(result).toContain("DEFAULT_RADIUS_KM=\n");
  });

  it("hängt unbekannte Keys ans Ende an", () => {
    const result = renderEnv(TEMPLATE, { APPLICANT_FIRST_NAME: "Jonas" });
    expect(result.trimEnd().endsWith("APPLICANT_FIRST_NAME=Jonas")).toBe(true);
    // bekannte Zeilen bleiben erhalten
    expect(result).toContain("SEARCH_TERMS=");
  });

  it("ersetzt mehrere Keys gleichzeitig und ändert nur diese", () => {
    const result = renderEnv(TEMPLATE, {
      OPENAI_API_KEY: "sk-123",
      SEARCH_TERMS: "KI Manager,AI Consultant",
    });
    expect(result).toContain("OPENAI_API_KEY=sk-123");
    expect(result).toContain("SEARCH_TERMS=KI Manager,AI Consultant");
    expect(result).toContain("DEFAULT_LOCATION=");
  });
});
