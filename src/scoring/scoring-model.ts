/**
 * Regelbasiertes Bewertungsmodell für das Zielprofil:
 * "Erfahrene Berufstätige mit neuem KI-Manager-Zertifikat (z. B. IHK),
 *  die ihre erste dedizierte Rolle im KI-Management suchen."
 *
 * Jedes Signal ist ein benanntes Pattern mit Gewicht, damit die Bewertung
 * nachvollziehbar bleibt (kein Blackbox-Keyword-Matching: Signale werden
 * über Titel UND Beschreibung/Anforderungen ausgewertet, positive wie
 * negative, und im Reasoning einzeln ausgewiesen).
 */

export interface Signal {
  label: string;
  pattern: RegExp;
  weight: number;
}

// --- A. Rollenpassung (0–25) -----------------------------------------------

export const ROLE_POSITIVE: Signal[] = [
  { label: "KI-/AI-Manager-Rolle", pattern: /\b(ki|ai)[\s-]?manager\b/i, weight: 10 },
  { label: "KI-Projektmanagement", pattern: /(ki|ai)[\s-]?(projekt|project)[\s-]?manag/i, weight: 8 },
  { label: "KI-/AI-Transformation", pattern: /(ki|ai)[\s-]?transformation/i, weight: 8 },
  { label: "KI-Governance", pattern: /(ki|ai)[\s-]?governance|eu ai act|ai act/i, weight: 7 },
  { label: "AI Consultant mit Business-Fokus", pattern: /(ki|ai)[\s-]?(consultant|berat)/i, weight: 6 },
  { label: "KI-Strategie", pattern: /(ki|ai)[\s-]?strategie|ai strategy/i, weight: 6 },
  { label: "KI-Einführung / -Implementierung", pattern: /(ki|ai)[\s-]?(einführung|implementierung|implementation|adoption|rollout)/i, weight: 6 },
  { label: "KI-Change-Management", pattern: /change[\s-]?management/i, weight: 4 },
  { label: "KI-Schulung / Enablement", pattern: /schulung|enablement|trainings?|workshops?/i, weight: 3 },
  { label: "Prozessautomatisierung", pattern: /prozessautomatisierung|automatisierung|automation/i, weight: 3 },
  { label: "Stakeholder-Kommunikation", pattern: /stakeholder/i, weight: 2 },
];

export const ROLE_NEGATIVE: Signal[] = [
  { label: "Reine Data-Scientist-Rolle", pattern: /data scientist/i, weight: -8 },
  { label: "Reine ML-Engineer-Rolle", pattern: /\bml[\s-]?engineer|machine learning engineer/i, weight: -8 },
  { label: "Reine Softwareentwickler-Rolle", pattern: /softwareentwickler|software (developer|engineer)\b/i, weight: -6 },
  { label: "Praktikum", pattern: /praktik(um|ant)|intern(ship)?\b/i, weight: -15 },
  { label: "Werkstudentenstelle", pattern: /werkstudent/i, weight: -15 },
  { label: "Explizite Junior-Rolle", pattern: /\bjunior\b/i, weight: -8 },
  { label: "Sehr seniorige KI-Führungsrolle", pattern: /(head of ai|chief ai|vp ai|director ai|\b(8|9|10)\+? jahre)/i, weight: -6 },
];

// --- B. Erfahrungslevel-Fit (0–20) -----------------------------------------

export const EXPERIENCE_POSITIVE: Signal[] = [
  { label: "Allgemeine Berufserfahrung wird anerkannt", pattern: /berufserfahrung|professional experience|mehrjährige erfahrung/i, weight: 5 },
  { label: "Quereinstieg möglich", pattern: /quereinst|career changer|auch ohne (ki|ai)[\s-]?erfahrung/i, weight: 6 },
  { label: "Projektmanagement-Erfahrung relevant", pattern: /projektmanagement|projektleitung/i, weight: 4 },
  { label: "Beratungs-/Führungserfahrung relevant", pattern: /beratung|consulting|führungserfahrung/i, weight: 3 },
  { label: "Zertifikat/Weiterbildung wird akzeptiert", pattern: /zertifi|weiterbildung|certificate|fortbildung/i, weight: 5 },
];

export const EXPERIENCE_NEGATIVE: Signal[] = [
  { label: "Explizit Junior", pattern: /\bjunior\b|einstiegsposition|berufseinsteiger/i, weight: -8 },
  { label: "Langjährige KI-spezifische Erfahrung zwingend", pattern: /(\b[5-9]|10)\+?\s*jahre[^.\n]{0,40}(ki|ai|machine learning|data science)/i, weight: -8 },
  { label: "PhD/Forschungslaufbahn zwingend", pattern: /phd|promotion( erforderlich| vorausgesetzt)|dissertation/i, weight: -7 },
  { label: "Tiefes ML-/Data-Science-Profil zwingend", pattern: /(fundierte|tiefe|umfassende)[^.\n]{0,30}(machine learning|data science|deep learning)[^.\n]{0,30}(kenntnisse|erfahrung)/i, weight: -6 },
  { label: "Produktive ML-/LLM-Engineering-Erfahrung zwingend", pattern: /(mlops|model training|modelltraining|produktionserfahrung[^.\n]{0,20}ml)/i, weight: -5 },
];

// --- D. Technischer Fit (0–10) ---------------------------------------------

export const TECH_REALISTIC: Signal[] = [
  { label: "Grundlegendes KI-Verständnis", pattern: /ki[\s-]?(grundlagen|verständnis)|verständnis (von|für) (ki|ai)/i, weight: 3 },
  { label: "LLMs / Prompting", pattern: /\bllm|large language|prompt/i, weight: 3 },
  { label: "KI-Tools / Copilot / ChatGPT", pattern: /chatgpt|copilot|ki[\s-]?tools|ai[\s-]?tools/i, weight: 2 },
  { label: "Automatisierung", pattern: /automatisierung|automation|n8n|make|rpa|power automate/i, weight: 2 },
  { label: "Datenschutz-/Governance-Verständnis", pattern: /datenschutz|dsgvo|governance|compliance/i, weight: 2 },
  { label: "Schnittstelle Business/Technik", pattern: /schnittstelle|brücke zwischen|business und (it|technik)/i, weight: 2 },
];

export const TECH_DEMANDING: Signal[] = [
  { label: "Python-Produktionserfahrung zwingend", pattern: /python[^.\n]{0,40}(produktion|production|sehr gute|fundierte)/i, weight: -3 },
  { label: "ML-Modelltraining zwingend", pattern: /modelltraining|model training|training von modellen|pytorch|tensorflow/i, weight: -3 },
  { label: "MLOps zwingend", pattern: /mlops/i, weight: -3 },
  { label: "Senior-Cloud-Architektur zwingend", pattern: /cloud[\s-]?architekt|solution architect/i, weight: -2 },
  { label: "Data Engineering als Hauptrolle", pattern: /data engineer/i, weight: -3 },
];

// --- C. CV-Match: Anforderungs-Dimensionen ----------------------------------
// Jede Dimension prüft: Fordert die Stelle das? Bietet der CV das?

export interface CvMatchDimension {
  label: string;
  jobPattern: RegExp;
  cvKey:
    | "experience"
    | "industry"
    | "projectManagement"
    | "leadership"
    | "stakeholder"
    | "itUnderstanding"
    | "aiCertificate"
    | "consulting"
    | "changeManagement"
    | "training"
    | "processAnalysis"
    | "automation";
  points: number;
}

export const CV_MATCH_DIMENSIONS: CvMatchDimension[] = [
  { label: "Berufserfahrung", jobPattern: /berufserfahrung|erfahrung|experience/i, cvKey: "experience", points: 3 },
  { label: "Branchenfit", jobPattern: /branche|industrie|sektor|umfeld/i, cvKey: "industry", points: 2 },
  { label: "Projektmanagement", jobPattern: /projektmanagement|projektleitung|project management|scrum|agil/i, cvKey: "projectManagement", points: 3 },
  { label: "Führung", jobPattern: /führung|leitung|team lead|steuerung von teams/i, cvKey: "leadership", points: 2 },
  { label: "Stakeholder-Kommunikation", jobPattern: /stakeholder|kommunikation|präsentation/i, cvKey: "stakeholder", points: 2 },
  { label: "IT-/Technologieverständnis", jobPattern: /\bit\b|technolog|digital|system/i, cvKey: "itUnderstanding", points: 2 },
  { label: "KI-Zertifikat / KI-Weiterbildung", jobPattern: /\bki\b|\bai\b|künstliche intelligenz|artificial intelligence/i, cvKey: "aiCertificate", points: 3 },
  { label: "Beratungserfahrung", jobPattern: /beratung|consulting|kunden/i, cvKey: "consulting", points: 2 },
  { label: "Change Management", jobPattern: /change|transformation|adoption/i, cvKey: "changeManagement", points: 2 },
  { label: "Schulung & Enablement", jobPattern: /schulung|training|enablement|workshop/i, cvKey: "training", points: 2 },
  { label: "Prozessanalyse", jobPattern: /prozess(e|analyse|optimierung)/i, cvKey: "processAnalysis", points: 1 },
  { label: "Automatisierung", jobPattern: /automatisierung|automation/i, cvKey: "automation", points: 1 },
];

/** Erkennung von Muss- und Kann-Kriterien in Anforderungstexten. */
export const MUST_PATTERN = /(zwingend|erforderlich|vorausgesetzt|voraussetzung|must[\s-]?have|notwendig|unabdingbar|setzen wir voraus)/i;
export const NICE_PATTERN = /(wünschenswert|von vorteil|idealerweise|nice[\s-]?to[\s-]?have|plus|optional|gerne)/i;
