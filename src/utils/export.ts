import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { StoredJob } from "../types.js";
import { recommendationLabel } from "../types.js";

function csvEscape(value: string | number | null): string {
  const s = String(value ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(jobs: StoredJob[], exportDir: string): string {
  mkdirSync(exportDir, { recursive: true });
  const file = path.join(exportDir, "jobs.csv");
  const header = ["ID", "Score", "Empfehlung", "Jobtitel", "Unternehmen", "Standort", "Remote", "Portal", "Status", "URL"];
  const rows = jobs.map((j) =>
    [j.id, j.score ?? "", j.recommendation, j.title, j.company, j.location, j.remoteOption, j.portal, j.status, j.url]
      .map(csvEscape)
      .join(","),
  );
  writeFileSync(file, [header.join(","), ...rows].join("\n"), "utf-8");
  return file;
}

/** Erzeugt die Nutzer-Übersicht als Markdown (Tabelle + Top-Empfehlungen). */
export function buildMarkdownReport(jobs: StoredJob[]): string {
  const scored = jobs.filter((j) => j.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const lines: string[] = ["# Gefundene KI-Manager-Stellen", ""];

  if (scored.length === 0) {
    lines.push("Noch keine bewerteten Stellen vorhanden. Führe zuerst `npm run scrape` aus.");
    return lines.join("\n");
  }

  lines.push("| ID | Score | Empfehlung | Jobtitel | Unternehmen | Standort | Portal | Link |");
  lines.push("|---:|---:|---|---|---|---|---|---|");
  for (const j of scored) {
    const loc = [j.location, j.remoteOption].filter(Boolean).join(" / ");
    lines.push(
      `| ${j.id} | ${j.score} | ${j.recommendation} | ${j.title} | ${j.company} | ${loc || "–"} | ${j.portal} | [Anzeige](${j.url}) |`,
    );
  }

  lines.push("", "## Top-Empfehlungen", "");
  const top = scored.filter((j) => (j.score ?? 0) >= 55).slice(0, 5);
  if (top.length === 0) lines.push("Keine Stelle hat aktuell mindestens 55/100 Punkte erreicht.");

  top.forEach((j, i) => {
    lines.push(`### ${i + 1}. ${j.title} – ${j.company}`, "");
    lines.push(`**Score:** ${j.score}/100  `);
    lines.push(`**Empfehlung:** ${j.recommendation} (${recommendationLabel(j.score ?? 0)})`);
    if (j.incomplete) lines.push("", "> ⚠️ Anzeige wurde unvollständig ausgelesen – „unvollständig geprüft“.");
    lines.push("", "**Warum passend:**");
    lines.push(...(j.cvMatches.length ? j.cvMatches.map((m) => `- ${m}`) : ["- (keine Treffer erkannt)"]));
    lines.push("", "**Mögliche Lücken:**");
    lines.push(...(j.gaps.length ? j.gaps.map((g) => `- ${g}`) : ["- keine erkannt"]));
    if (j.cvOptimizationSuggestions.length) {
      lines.push("", "**CV-Optimierung:**");
      lines.push(...j.cvOptimizationSuggestions.map((s) => `- ${s}`));
    }
    if (j.mustCriteria.length) {
      lines.push("", "**Erkannte Muss-Kriterien:**");
      lines.push(...j.mustCriteria.slice(0, 5).map((m) => `- ${m}`));
    }
    lines.push("", `**Begründung im Detail:**`, "");
    lines.push(...j.scoreReasoning.split("\n").map((r) => `> ${r}`));
    lines.push("");
  });

  return lines.join("\n");
}

export function exportMarkdownReport(jobs: StoredJob[], exportDir: string): string {
  mkdirSync(exportDir, { recursive: true });
  const file = path.join(exportDir, "report.md");
  writeFileSync(file, buildMarkdownReport(jobs), "utf-8");
  return file;
}
