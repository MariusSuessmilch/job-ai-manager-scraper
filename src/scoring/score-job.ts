import type { CvProfile, JobDetails, JobScore, ScoreBreakdown } from "../types.js";
import { recommendationForScore } from "../types.js";
import {
  CV_MATCH_DIMENSIONS,
  EXPERIENCE_NEGATIVE,
  EXPERIENCE_POSITIVE,
  MUST_PATTERN,
  NICE_PATTERN,
  ROLE_NEGATIVE,
  ROLE_POSITIVE,
  TECH_DEMANDING,
  TECH_REALISTIC,
  type Signal,
} from "./scoring-model.js";

export interface LocationPreference {
  location: string;
  remote: "remote" | "hybrid" | "onsite" | "";
}

export interface ScoringResult {
  score: JobScore;
  mustCriteria: string[];
  niceToHaveCriteria: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface SignalHits {
  score: number;
  positive: string[];
  negative: string[];
}

/** Wertet Signale gegen Titel (doppelt gewichtet) und Volltext aus. */
function evaluateSignals(title: string, fullText: string, positive: Signal[], negative: Signal[]): SignalHits {
  let score = 0;
  const hitsPos: string[] = [];
  const hitsNeg: string[] = [];
  for (const s of positive) {
    const inTitle = s.pattern.test(title);
    const inText = s.pattern.test(fullText);
    if (inTitle || inText) {
      score += inTitle ? s.weight * 1.5 : s.weight;
      hitsPos.push(s.label);
    }
  }
  for (const s of negative) {
    const inTitle = s.pattern.test(title);
    const inText = s.pattern.test(fullText);
    if (inTitle || inText) {
      score += inTitle ? s.weight * 1.5 : s.weight;
      hitsNeg.push(s.label);
    }
  }
  return { score, positive: hitsPos, negative: hitsNeg };
}

function cvOffers(profile: CvProfile, key: (typeof CV_MATCH_DIMENSIONS)[number]["cvKey"]): boolean {
  switch (key) {
    case "experience":
      return (profile.yearsOfExperience ?? 0) >= 2;
    case "industry":
      return profile.industries.length > 0;
    case "projectManagement":
      return profile.hasProjectManagementExperience;
    case "leadership":
      return profile.hasLeadershipExperience;
    case "stakeholder":
      return /stakeholder|kommunikation|präsentation/i.test(profile.rawText);
    case "itUnderstanding":
      return profile.itSkills.length > 0;
    case "aiCertificate":
      return profile.hasAiManagerCertificate || profile.aiSkills.length >= 3;
    case "consulting":
      return profile.hasConsultingExperience;
    case "changeManagement":
      return profile.hasChangeManagementExperience;
    case "training":
      return profile.hasTrainingExperience;
    case "processAnalysis":
      return /prozess/i.test(profile.rawText);
    case "automation":
      return /automatisierung|automation|n8n|make|rpa/i.test(profile.rawText);
  }
}

/** Extrahiert Muss- und Kann-Kriterien zeilenweise aus dem Anforderungstext. */
export function extractCriteria(requirementsText: string): { must: string[]; nice: string[] } {
  const lines = requirementsText
    .split(/\n|(?<=[.;])\s+/)
    .map((l) => l.replace(/^[\s•\-*\t]+/, "").trim())
    .filter((l) => l.length > 15 && l.length < 300);
  const must: string[] = [];
  const nice: string[] = [];
  for (const line of lines) {
    if (NICE_PATTERN.test(line)) nice.push(line);
    else if (MUST_PATTERN.test(line)) must.push(line);
  }
  return { must: must.slice(0, 10), nice: nice.slice(0, 10) };
}

function scoreLocationFit(job: JobDetails, pref: LocationPreference): { points: number; note: string } {
  const remoteText = `${job.remoteOption} ${job.location} ${job.description}`.toLowerCase();
  const jobIsRemote = /remote|home.?office/i.test(remoteText);
  const jobIsHybrid = /hybrid/i.test(remoteText);

  if (!pref.location && !pref.remote) {
    return { points: 5, note: "Keine Standortpräferenz angegeben – neutral bewertet (5/10)." };
  }
  let points = 0;
  const notes: string[] = [];
  if (pref.remote) {
    if (pref.remote === "remote" && jobIsRemote) points += 5;
    else if (pref.remote === "hybrid" && (jobIsHybrid || jobIsRemote)) points += 5;
    else if (pref.remote === "onsite" && !jobIsRemote) points += 5;
    else if (jobIsHybrid) points += 3;
    notes.push(`Arbeitsmodell-Präferenz "${pref.remote}" vs. Stelle: ${job.remoteOption || "keine Angabe"}.`);
  } else {
    points += 3;
  }
  if (pref.location) {
    const prefCity = pref.location.toLowerCase().split(",")[0].trim();
    if (job.location.toLowerCase().includes(prefCity)) {
      points += 5;
      notes.push(`Standort passt zu Präferenz ${pref.location}.`);
    } else if (jobIsRemote) {
      points += 4;
      notes.push("Standort weicht ab, aber Remote möglich.");
    } else {
      notes.push(`Standort ${job.location || "unbekannt"} weicht von Präferenz ${pref.location} ab.`);
    }
  } else {
    points += 2;
  }
  return { points: clamp(points, 0, 10), note: notes.join(" ") };
}

/**
 * Berechnet den Job-Fit-Score (0–100) für eine Stelle gegen das CV-Profil.
 * Regelbasiert, deterministisch und vollständig begründet.
 */
export function scoreJob(job: JobDetails, profile: CvProfile, pref: LocationPreference): ScoringResult {
  const fullText = [job.description, job.requirements, job.tasks, job.benefits].join("\n");
  const reasoning: string[] = [];

  // A. Rollenpassung (0–25)
  const role = evaluateSignals(job.title, fullText, ROLE_POSITIVE, ROLE_NEGATIVE);
  const roleFit = clamp(Math.round(role.score), 0, 25);
  reasoning.push(
    `Rollenpassung ${roleFit}/25: ` +
      (role.positive.length ? `passend: ${role.positive.join(", ")}. ` : "kaum KI-Management-Signale. ") +
      (role.negative.length ? `Abzüge: ${role.negative.join(", ")}.` : ""),
  );

  // B. Erfahrungslevel-Fit (0–20)
  const exp = evaluateSignals(job.title, fullText, EXPERIENCE_POSITIVE, EXPERIENCE_NEGATIVE);
  let expBase = exp.score + 6; // Basis: ohne explizite Junior-/Senior-Schranken ist die Stelle offen
  const experienceLevelFit = clamp(Math.round(expBase), 0, 20);
  reasoning.push(
    `Erfahrungslevel-Fit ${experienceLevelFit}/20: ` +
      (exp.positive.length ? `${exp.positive.join(", ")}. ` : "") +
      (exp.negative.length ? `Hürden: ${exp.negative.join(", ")}.` : "keine harten Junior-/Senior-Schranken erkannt."),
  );

  // C. CV-Match (0–25)
  const matches: string[] = [];
  const gaps: string[] = [];
  let cvPoints = 0;
  let demanded = 0;
  for (const dim of CV_MATCH_DIMENSIONS) {
    if (!dim.jobPattern.test(fullText)) continue;
    demanded += dim.points;
    if (cvOffers(profile, dim.cvKey)) {
      cvPoints += dim.points;
      matches.push(dim.label);
    } else {
      gaps.push(dim.label);
    }
  }
  const cvMatch = demanded > 0 ? clamp(Math.round((cvPoints / demanded) * 25), 0, 25) : 12;
  reasoning.push(
    `CV-Match ${cvMatch}/25: ` +
      (demanded === 0
        ? "Anforderungen unvollständig auslesbar – neutral bewertet."
        : `erfüllt: ${matches.join(", ") || "–"}; Lücken: ${gaps.join(", ") || "keine"}.`),
  );

  // D. Technischer Fit (0–10)
  const tech = evaluateSignals(job.title, fullText, TECH_REALISTIC, TECH_DEMANDING);
  const technicalFit = clamp(Math.round(tech.score + 3), 0, 10);
  reasoning.push(
    `Technischer Fit ${technicalFit}/10: ` +
      (tech.positive.length ? `realistisch: ${tech.positive.join(", ")}. ` : "") +
      (tech.negative.length ? `anspruchsvoll: ${tech.negative.join(", ")}.` : ""),
  );

  // E. Bewerbungswahrscheinlichkeit (0–10) – abgeleitet aus A–D
  const { must, nice } = extractCriteria(job.requirements || fullText);
  const partialRatio = (roleFit / 25 + experienceLevelFit / 20 + cvMatch / 25 + technicalFit / 10) / 4;
  let applicationProbability = clamp(Math.round(partialRatio * 10), 0, 10);
  if (gaps.length > 4) applicationProbability = clamp(applicationProbability - 2, 0, 10);
  reasoning.push(
    `Bewerbungswahrscheinlichkeit ${applicationProbability}/10 (abgeleitet aus Rollen-, Level-, CV- und Technik-Fit; ${gaps.length} Lücken).`,
  );

  // F. Standort-Fit (0–10)
  const loc = scoreLocationFit(job, pref);
  reasoning.push(`Standort-/Arbeitsmodell-Fit ${loc.points}/10: ${loc.note}`);

  if (job.incomplete) {
    reasoning.push("Hinweis: Stellenanzeige wurde unvollständig ausgelesen – Bewertung als „unvollständig geprüft“ kennzeichnen.");
  }

  const breakdown: ScoreBreakdown = {
    role_fit: roleFit,
    experience_level_fit: experienceLevelFit,
    cv_match: cvMatch,
    technical_fit: technicalFit,
    application_probability: applicationProbability,
    location_fit: loc.points,
  };
  const total = clamp(
    Object.values(breakdown).reduce((a, b) => a + b, 0),
    0,
    100,
  );

  const cvSuggestions: string[] = [];
  if (gaps.includes("Change Management")) cvSuggestions.push("Change- und Adoptions-Erfahrung im CV stärker herausarbeiten.");
  if (gaps.includes("KI-Zertifikat / KI-Weiterbildung")) cvSuggestions.push("KI-Manager-Zertifikat (z. B. IHK) prominenter platzieren bzw. ergänzen.");
  if (gaps.includes("Führung")) cvSuggestions.push("Führungs- oder Steuerungsverantwortung (auch lateral) sichtbar machen.");
  if (matches.includes("Projektmanagement")) cvSuggestions.push("Projektmanagement-Erfahrung explizit auf KI-Einführung/Transformation beziehen.");
  if (matches.includes("KI-Zertifikat / KI-Weiterbildung")) cvSuggestions.push("KI-Weiterbildung und KI-Praxisbeispiele in den ersten Profilabschnitt aufnehmen.");

  const coverLetterAngles: string[] = matches
    .slice(0, 4)
    .map((m) => `Konkretes Beispiel für "${m}" aus der bisherigen Berufserfahrung anführen.`);
  if (profile.hasAiManagerCertificate) {
    coverLetterAngles.push("Neues KI-Manager-Zertifikat als gezielten nächsten Karriereschritt einordnen (kein Junior-Neustart).");
  }

  const score: JobScore = {
    job_title: job.title,
    company: job.company,
    location: job.location,
    remote_option: job.remoteOption,
    url: job.url,
    score_total: total,
    score_breakdown: breakdown,
    recommendation: recommendationForScore(total),
    reasoning: reasoning.join("\n"),
    strong_matches: [...new Set([...role.positive.slice(0, 5), ...matches])],
    gaps: [...new Set([...gaps, ...role.negative, ...exp.negative])],
    cv_optimization_suggestions: cvSuggestions,
    cover_letter_angles: coverLetterAngles,
  };

  return { score, mustCriteria: must, niceToHaveCriteria: nice };
}
