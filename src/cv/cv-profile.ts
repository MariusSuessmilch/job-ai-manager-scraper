import type { CvProfile } from "../types.js";

/**
 * Strukturiert den Lebenslauf-Volltext heuristisch in ein CvProfile.
 * Bewusst regelbasiert und nachvollziehbar: Jedes Feld lässt sich auf
 * konkrete Textstellen zurückführen. Die semantische Feinbewertung passiert
 * später im Scoring (optional LLM-gestützt).
 */

const AI_SKILL_PATTERNS: [string, RegExp][] = [
  ["LLM / Large Language Models", /\bLLMs?\b|large language model/i],
  ["Generative AI", /generative ai|generativ\w* ki/i],
  ["RAG", /\bRAG\b|retrieval augmented/i],
  ["Prompt Engineering", /prompt.?engineering|prompting/i],
  ["AI Agents / Agentic Workflows", /ai.?agents?|agentic/i],
  ["Machine Learning", /machine.?learning|\bML\b/i],
  ["KI-Governance / EU AI Act", /ai.?governance|ki.?governance|eu ai act|ai act/i],
  ["KI-Schulungen", /ki.?schulung|ai.?training|ki.?workshop/i],
  ["Datenschutz / DSGVO", /dsgvo|datenschutz|gdpr/i],
  ["Fine-Tuning", /fine.?tuning/i],
  ["Embeddings / Vektorsuche", /embedding|vector|pinecone|ai search/i],
];

const IT_SKILL_PATTERNS: [string, RegExp][] = [
  ["Python", /\bpython\b/i],
  ["SQL", /\bsql\b/i],
  ["Cloud (Azure/AWS/GCP)", /\bazure\b|\baws\b|\bgcp\b|google cloud/i],
  ["APIs / Integration", /\bapi\b|rest|schnittstelle/i],
  ["Automatisierung (n8n/Make/RPA)", /\bn8n\b|\bmake\b|\brpa\b|workflow.?automat/i],
  ["BI / Datenanalyse", /power bi|tableau|business intelligence|datenanalyse/i],
  ["Docker / DevOps", /\bdocker\b|kubernetes|ci\/cd/i],
  ["LangChain-Ökosystem", /langchain|langgraph|langsmith/i],
];

const ROLE_PATTERNS: [string, RegExp][] = [
  ["KI-/AI-Management", /ai.?(implementation.?)?manager|ki.?manager/i],
  ["Projektmanagement", /projektmanage|project manage|projektleit/i],
  ["Beratung", /consultant|berater|consulting|beratung/i],
  ["Führung", /führung|leitung|teamlead|head of|disziplinarisch/i],
  ["Change Management", /change.?management|transformation/i],
  ["Business Intelligence / Data", /business intelligence|data analyst|data scien/i],
  ["Produktmanagement", /product owner|produktmanage|product manage/i],
];

const INDUSTRY_PATTERNS: [string, RegExp][] = [
  ["IT-/KI-Dienstleistung", /it.?dienstleist|ki.?dienstleist|software|tech/i],
  ["Beratung", /consulting|beratung/i],
  ["Finanzen/Versicherung", /finanz|bank|versicherung|insurance/i],
  ["Industrie/Produktion", /industrie|produktion|fertigung|manufactur/i],
  ["Handel/E-Commerce", /handel|e-?commerce|retail/i],
  ["Gesundheitswesen", /gesundheit|pharma|klinik|health/i],
  ["Öffentlicher Sektor", /öffentlich|behörde|verwaltung/i],
];

const AI_MANAGER_CERT = /ki.?manager|ai.?manager.{0,30}(ihk|zertifi)|ihk.{0,40}ki|zertifizierter? ki/i;

function matchAll(text: string, patterns: [string, RegExp][]): string[] {
  return patterns.filter(([, re]) => re.test(text)).map(([label]) => label);
}

/** Schätzt Berufsjahre aus Zeiträumen wie "06/2020 – 02/2023" oder expliziten Angaben. */
export function estimateYearsOfExperience(text: string, now = new Date()): number | null {
  const explicit = text.match(/(\d{1,2})\+?\s*(?:Jahren?|years?)\s*(?:Berufs)?(?:Erfahrung|experience)?/i);
  const ranges = [...text.matchAll(/(\d{2})\/(\d{4})\s*[–-]\s*(?:(\d{2})\/(\d{4})|heute|today|present)/gi)];
  let months = 0;
  for (const m of ranges) {
    const start = new Date(Number(m[2]), Number(m[1]) - 1);
    const end = m[3] ? new Date(Number(m[4]), Number(m[3]) - 1) : now;
    const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diff > 0 && diff < 50 * 12) months += diff;
  }
  if (months > 0) return Math.round(months / 12);
  if (explicit) return Number(explicit[1]);
  return null;
}

function extractCertificates(text: string): string[] {
  const certs: string[] = [];
  for (const line of text.split("\n")) {
    const cleaned = line.replace(/^[\s•\-*•\t]+/, "").trim();
    const looksLikeCert = /zertifi|certified|certificate|specialization|ihk|prince2|pmp|itil|scrum\.org/i.test(cleaned);
    // Jahreszahl oder IHK als Anker, damit Fließtext-Sätze nicht als Zertifikat gelten
    const hasAnchor = /\b(19|20)\d{2}\b|ihk/i.test(cleaned);
    if (cleaned.length > 5 && cleaned.length < 150 && looksLikeCert && hasAnchor) {
      certs.push(cleaned);
    }
  }
  return [...new Set(certs)];
}

function extractEducation(text: string): string[] {
  const matches = [
    ...text.matchAll(/\b((?:B\.?\s?Sc\.?|M\.?\s?Sc\.?|MBA|Bachelor|Master|Dipl\.[\w-]*|Diplom|PhD|Promotion)\b[^\n]{3,100})/g),
  ];
  return [...new Set(matches.map((m) => m[1].trim()))].slice(0, 6);
}

function extractLanguages(text: string): string[] {
  const langs = ["Deutsch", "Englisch", "Französisch", "Spanisch", "Italienisch", "Polnisch", "Türkisch", "Russisch", "Chinesisch"];
  return langs.filter((l) => new RegExp(`\\b${l}\\b`, "i").test(text));
}

function extractAchievements(text: string): string[] {
  // Ergebniszeilen: enthalten Zahlen + Wirkung (%-Angaben, "Reduktion", "Steigerung" ...)
  const lines = text.split("\n").map((l) => l.replace(/^[\s•\-*•\t]+/, "").trim());
  return lines
    .filter((l) => l.length > 20 && l.length < 250 && /\d+\s*%|reduktion|steigerung|erfolg|ergebnis|roi|einsparung/i.test(l))
    .slice(0, 8);
}

export function buildCvProfile(rawText: string, sourceFile: string): CvProfile {
  const text = rawText.normalize("NFC");
  const certificates = extractCertificates(text);
  return {
    rawText: text,
    sourceFile,
    yearsOfExperience: estimateYearsOfExperience(text),
    roles: matchAll(text, ROLE_PATTERNS),
    industries: matchAll(text, INDUSTRY_PATTERNS),
    hasLeadershipExperience: /führung|leitung|steuerung.{0,30}team|disziplinarisch|head of|budgetverantwortung/i.test(text),
    hasProjectManagementExperience: /projektmanage|projektleit|project manage|scrum|kanban|agil/i.test(text),
    hasConsultingExperience: /consult|berat/i.test(text),
    hasChangeManagementExperience: /change.?management|adoption|transformation/i.test(text),
    hasTrainingExperience: /schulung|training|workshop|enablement|champions/i.test(text),
    itSkills: matchAll(text, IT_SKILL_PATTERNS),
    aiSkills: matchAll(text, AI_SKILL_PATTERNS),
    certificates,
    hasAiManagerCertificate: AI_MANAGER_CERT.test(text) || certificates.some((c) => AI_MANAGER_CERT.test(c)),
    education: extractEducation(text),
    languages: extractLanguages(text),
    achievements: extractAchievements(text),
  };
}
