/**
 * Zerlegt den Volltext einer Stepstone-Anzeige in Abschnitte
 * (Aufgaben, Anforderungen, Benefits). Rein textbasiert und damit
 * unabhängig vom konkreten Markup der Detailseite.
 */

const SECTION_HEADINGS: { key: "tasks" | "requirements" | "benefits"; pattern: RegExp }[] = [
  { key: "tasks", pattern: /^(deine?\s+aufgaben|ihre\s+aufgaben|aufgaben|das erwartet dich|ihr aufgabengebiet|your (tasks|responsibilities)|responsibilities)\b/i },
  { key: "requirements", pattern: /^(dein profil|ihr profil|profil|anforderungen|das bringst du mit|was du mitbringst|qualifikationen|requirements|your profile|qualifications)\b/i },
  { key: "benefits", pattern: /^(wir bieten|das bieten wir|benefits|deine vorteile|ihre vorteile|unser angebot|what we offer)\b/i },
];

export interface ParsedSections {
  tasks: string;
  requirements: string;
  benefits: string;
}

export function parseJobSections(fullText: string): ParsedSections {
  const result: ParsedSections = { tasks: "", requirements: "", benefits: "" };
  const lines = fullText.split("\n").map((l) => l.trim());
  let current: keyof ParsedSections | null = null;
  for (const line of lines) {
    const heading = SECTION_HEADINGS.find((h) => h.pattern.test(line));
    if (heading && line.length < 80) {
      current = heading.key;
      continue;
    }
    if (current && line.length > 0) {
      result[current] += (result[current] ? "\n" : "") + line;
    }
  }
  return result;
}

/** Erkennt das Arbeitsmodell aus Anzeigentext und Metadaten. */
export function detectRemoteOption(text: string): string {
  const t = text.toLowerCase();
  if (/100\s?%\s?remote|vollständig remote|full remote/.test(t)) return "Remote";
  if (/hybrid/.test(t)) return "Hybrid";
  if (/home.?office|mobiles arbeiten|remote/.test(t)) return "Hybrid/Home-Office möglich";
  return "";
}

/** Baut die Stepstone-Such-URL für einen Suchbegriff. */
export function buildSearchUrl(baseUrl: string, searchTerm: string, location?: string, radiusKm?: number): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  let url = `${baseUrl}/jobs/${slug(searchTerm)}`;
  if (location) url += `/in-${slug(location)}`;
  const params = new URLSearchParams();
  if (location && radiusKm) params.set("radius", String(radiusKm));
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}
