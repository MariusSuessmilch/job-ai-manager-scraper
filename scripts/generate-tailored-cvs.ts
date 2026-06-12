/**
 * Erzeugt pro Top-Job eine auf die Stelle optimierte CV-Version aus der Basis
 * (data/exports/cv-optimiert/_basis-jonas-berger.md). Angepasst werden nur
 * Profil-Absatz und eine Schwerpunkt-Sektion – alle Fakten stammen aus dem
 * Original-Lebenslauf, es wird nichts erfunden.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = "./data/exports/cv-optimiert";
const base = readFileSync(path.join(DIR, "_basis-jonas-berger.md"), "utf-8");

interface Tailoring {
  id: number;
  slug: string;
  job: string;
  profile: string;
  focus: string[];
}

const TAILORINGS: Tailoring[] = [
  {
    id: 2,
    slug: "kv-nordrhein-ki-manager",
    job: "KI-Manager/in (w/m/d) IT424 – Kassenzahnärztliche Vereinigung Nordrhein",
    profile:
      "AI Implementation Manager (M.Sc. Wirtschaftsinformatik) mit über 6 Jahren Erfahrung in der Einführung und Weiterentwicklung KI-gestützter Anwendungen – von der Use-Case-Analyse bis zum produktiven Betrieb. Stark im strategischen KI-Management in regulierten Umfeldern: Aufbau von AI-Governance-Richtlinien (EU AI Act, DSGVO), Qualitätssicherung produktiver KI-Anwendungen und Schulung von über 200 Mitarbeitenden. Fundierte Datenaffinität aus mehrjähriger BI-Beratung (Python, SQL, Power BI) und strukturiertes, agiles Projektmanagement (zertifizierter Scrum Product Owner).",
    focus: [
      "Einführung KI-gestützter Anwendungen in Organisationen: 12+ Implementierungsprojekte von Anforderungsanalyse bis Go-live",
      "Strategisches KI-Management mit Zertifizierungen (Azure AI Engineer AI-102, Deep Learning Specialization)",
      "Projektmanagement im IT-/Digitalisierungsumfeld seit 2020, Budgetverantwortung bis 500.000 €",
      "Datenbasierte Analysen und digitale Prozesse: BI-Hintergrund mit Python, SQL, Power BI",
      "AI-Governance und Datenschutz (EU AI Act, DSGVO) – relevant für den regulierten Gesundheitssektor",
    ],
  },
  {
    id: 4,
    slug: "studyflix-ki-manager-automatisierung",
    job: "(Senior) KI Manager Automatisierung (m/w/d) – Studyflix GmbH",
    profile:
      "KI- und Automatisierungs-Manager mit über 6 Jahren Erfahrung im Aufbau produktiver Automatisierungs- und GenAI-Workflows. Praktische Erfahrung mit n8n und Make aus mehrjährigen Workflow-Automatisierungsprojekten für Mittelstand und Konzerne sowie mit Large Language Models, Prompt Engineering und Agentic Workflows aus 12+ produktiven GenAI-Implementierungen. Etablierte Prompt-Engineering-Guidelines und Evaluations-Pipelines (LangSmith) zur Qualitätssicherung. Nachweisbares Ergebnis: über 50 % automatisierte Antworten im Kundenservice eines SaaS-Anbieters.",
    focus: [
      "Workflow-Automatisierung mit n8n und Make (RPA-Projekte für Mittelstand und Konzerne, 2020–2023)",
      "Produktive LLM-Anwendungen: 12+ Projekte mit GPT-4, Claude und Open-Source-LLMs bis zum Go-live",
      "Prompt Engineering und Evaluations-Pipelines (LangSmith) als Qualitätsstandard",
      "RAG-Systeme und AI Agents (LangChain, LangGraph, Pinecone, Azure AI Search)",
      "Messbare Automatisierungserfolge: 50 % Automatisierungsquote, 40 % kürzere Bearbeitungszeit",
    ],
  },
  {
    id: 1,
    slug: "bw-partner-ki-manager-steuerberatung",
    job: "KI Manager – Steuerberatung & Digitalisierung (m/w/d) – BW PARTNER",
    profile:
      "AI Implementation Manager (M.Sc. Wirtschaftsinformatik) mit über 6 Jahren Erfahrung in KI- und Digitalisierungsprojekten, davon mehrere direkt in der Steuerberatung: Konzeption und Rollout von RAG-Systemen für Steuerberatungs- und Fachverlagskunden, u. a. ein Experten-GPT mit über 30.000 Fachquellen. Erfahren in der Entwicklung ganzheitlicher KI-Strategien, der Priorisierung von Use Cases nach Business Value und ROI sowie in Change Management und Schulung. Kombination aus Beratungshintergrund (IT- und Managementberatung) und produktiver KI-Umsetzung.",
    focus: [
      "Branchenerfahrung Steuerberatung: RAG-System und Experten-GPT (30.000+ Fachquellen) für Steuerberatungskunden",
      "Entwicklung und Umsetzung ganzheitlicher KI-Strategien inkl. Use-Case-Priorisierung nach ROI",
      "Über 6 Jahre Berufserfahrung in KI- und Digitalisierungsprojekten, davon 3+ Jahre dediziert GenAI/LLM",
      "Change Management und KI-Adoption: 200+ geschulte Mitarbeitende, Aufbau interner KI-Champions",
      "Automatisierung von Routineprozessen (Dokumentenklassifikation, RPA, n8n/Make)",
    ],
  },
  {
    id: 8,
    slug: "1und1-ai-governance-manager",
    job: "AI Governance Manager (w/m/d) – 1&1",
    profile:
      "AI Implementation Manager mit über 6 Jahren KI-Projekterfahrung und ausgeprägtem Governance-Schwerpunkt: Einführung von AI-Governance-Richtlinien nach EU AI Act und DSGVO bei Kundenorganisationen, Aufbau von Evaluations- und Qualitätssicherungs-Pipelines (LangSmith) als Freigabe- und Prüfgrundlage produktiver KI-Anwendungen sowie Schulung von über 200 Mitarbeitenden für den verantwortungsvollen KI-Einsatz. Erfahren in der Schnittstellenfunktion zwischen Fachbereichen, IT, Datenschutz und Management.",
    focus: [
      "Einführung von AI-Governance-Richtlinien (EU AI Act, DSGVO) in Kundenorganisationen",
      "Qualitätssicherungs- und Evaluations-Pipelines (LangSmith) als Prüf- und Freigabeprozesse für KI-Anwendungen",
      "Bestandsaufnahme und Priorisierung von KI-Use-Cases – Grundlage für ein zentrales KI-Register",
      "Stakeholder-Management auf C-Level und crossfunktionale Steuerung (Fachbereich, IT, Datenschutz)",
      "Enablement: KI-Schulungen, Workshops und Aufbau interner KI-Champions",
    ],
  },
  {
    id: 7,
    slug: "lotto-hessen-ki-manager",
    job: "KI Manager / AI Specialist (m/w/d) – LOTTO Hessen GmbH",
    profile:
      "AI Implementation Manager mit über 6 Jahren Erfahrung in der Einführung von KI-Tools und der KI-gestützten Prozessoptimierung. Praktische Erfahrung in der Konzeption von KI-Agenten und Agentic Workflows (LangChain, LangGraph) sowie in der abteilungsübergreifenden Identifikation und Automatisierung manueller, repetitiver Prozesse (RPA, n8n, Make). Stark in der Vermittlung zwischen Fachbereichen und Technik, in KI-Schulungen und im Aufbau interner KI-Kompetenz. Fundiertes Prozess- und Technikverständnis aus Beratung und produktiven KI-Implementierungen.",
    focus: [
      "Konzeption und Konfiguration von KI-Agenten und GenAI-Workflows (Content-/Text-Generierung, Automatisierung)",
      "Abteilungsübergreifende Prozessoptimierung: Identifikation und Automatisierung repetitiver Abläufe",
      "Einführung und Betreuung von KI-Tools inkl. Prompt-Engineering-Guidelines für Fachanwender",
      "KI-Schulungen und Workshops für über 200 Mitarbeitende, Aufbau interner KI-Champions",
      "Messbare Ergebnisse: 50 % Automatisierungsquote im Kundenservice, 40 % kürzere Bearbeitungszeiten",
    ],
  },
  {
    id: 15,
    slug: "dertour-finance-transformation-pm",
    job: "Manager Finance Transformation – Schwerpunkt Projektmanagement (m/w/d) – DERTOUR Group",
    profile:
      "Projekt- und Transformationsmanager (M.Sc. Wirtschaftsinformatik) mit über 6 Jahren Erfahrung in Digitalisierungs- und Automatisierungsprojekten für Mittelstand und Konzerne – inklusive PMO-Aufgaben, Stakeholder-Management auf C-Level und Moderation von Workshops und Schulungen. Zertifizierter Scrum Product Owner mit Budgetverantwortung bis 500.000 €. Hohe Affinität zu Digitalisierung, Automatisierung und KI: produktive GenAI- und RPA-Lösungen, KPI-Dashboards und Business Cases zur Erfolgsmessung von Transformationsinitiativen.",
    focus: [
      "Projektmanagement und Steuerung von Digitalisierungs-/Transformationsprojekten seit 2020 (Scrum, Kanban, Jira)",
      "Stakeholder-Management bis C-Level, Konzeption und Moderation von Workshops und Schulungen",
      "Business Cases, Kosten-Nutzen-Analysen und KPI-Dashboards zur Erfolgsmessung",
      "Automatisierung von Finanz- und Verwaltungsprozessen (RPA, n8n/Make, Dokumentenklassifikation)",
      "Branchenbezug Finance: BI- und Reporting-Lösungen für Finanz- und Versicherungskunden (Python, SQL, Power BI)",
    ],
  },
  {
    id: 18,
    slug: "dertour-finance-transformation-prozesse",
    job: "Manager Finance Transformation – Schwerpunkt Prozessoptimierung (m/w/d) – DERTOUR Group",
    profile:
      "Transformations- und Prozessmanager mit Beratungshintergrund (IT- und Managementberatung) und über 6 Jahren Erfahrung in der Analyse, Digitalisierung und Automatisierung von Geschäftsprozessen für Mittelstand und Konzerne. End-to-End-Blick aus RPA- und Workflow-Automatisierungsprojekten (n8n, Make) sowie produktiven KI-Lösungen zur Prozessautomatisierung. Erfahren in Change Management, Workshop-Moderation und der Erfolgsmessung über KPI-Dashboards und Business Cases. Branchenerfahrung u. a. bei Finanz- und Versicherungskunden.",
    focus: [
      "Analyse und Optimierung von End-to-End-Prozessen in Digitalisierungs- und Automatisierungsprojekten",
      "Consulting-Erfahrung: IT- und Managementberatung (Innovatis Consulting) sowie BI-Beratung (DataWorks)",
      "Prozessautomatisierung mit RPA, n8n und Make – inkl. messbarer Effizienzgewinne (z. B. -40 % Bearbeitungszeit)",
      "Change Management und Enablement bei der Einführung neuer Prozesse und Tools",
      "KPI-Dashboards und Business Cases als Steuerungs- und Erfolgsmessinstrumente",
    ],
  },
  {
    id: 30,
    slug: "nord-micro-leiter-entwicklungsprojekte",
    job: "Projektmanager als Leiter Entwicklungsprojekte (m/w/d) – Nord-Micro GmbH & Co. KG",
    profile:
      "Projektmanager (M.Sc. Wirtschaftsinformatik) mit über 6 Jahren Erfahrung in der Leitung technischer Entwicklungs- und Implementierungsprojekte – von der Anforderungsanalyse über Termin- und Budgetsteuerung (bis 500.000 €) bis zum produktiven Betrieb. Erfahren in der Steuerung crossfunktionaler Teams aus Engineers, Data Scientists und Kunden-IT, im Schnittstellen- und Risikomanagement sowie in transparenter Stakeholder-Kommunikation bis C-Level. Zertifizierter Scrum Product Owner mit Industrie-Projekterfahrung.",
    focus: [
      "Leitung von 12+ technischen Entwicklungs- und Implementierungsprojekten bis zum Go-live",
      "Termin-, Kosten- und Ressourcenplanung mit Budgetverantwortung bis 500.000 €",
      "Steuerung crossfunktionaler Teams und Definition von Schnittstellen (Engineering, IT, Fachbereich)",
      "Risikomanagement durch iterative Validierung mit echten Daten und wöchentliche Shipping-Zyklen",
      "Stakeholder-Kommunikation und Reporting bis C-Level, Branchenerfahrung Industrie",
    ],
  },
  {
    id: 6,
    slug: "curacon-tax-digitalisierung-ki",
    job: "Tax-Digitalisierungs- und KI-Manager (m/w/d) – CURACON",
    profile:
      "AI Implementation Manager mit über 6 Jahren Erfahrung in Digitalisierungs- und KI-Projekten, davon mehrere in der Steuerberatung: RAG-Systeme und ein Experten-GPT mit über 30.000 Fachquellen für Steuerberatungs- und Fachverlagskunden sowie LLM-basierte Dokumentenklassifikation und Automatisierung von Routineprozessen. Erfahren in der Analyse und Optimierung bestehender Arbeits- und Geschäftsprozesse, der Einführung und Betreuung moderner KI-Tools sowie in Schulung und Change Management.",
    focus: [
      "Branchenerfahrung Steuerberatung: RAG-System und Experten-GPT (30.000+ Fachquellen)",
      "Automatisierung von Routineprozessen: Dokumentenklassifikation, Texterstellung, RPA-Workflows",
      "Weiterentwicklung und Umsetzung von Digitalisierungsstrategien mit Use-Case-Priorisierung nach ROI",
      "Einführung und Betreuung von KI-Tools inkl. Guidelines und Qualitätssicherung",
      "Schulungen, Workshops und KI-Adoption: über 200 geschulte Mitarbeitende",
    ],
  },
  {
    id: 28,
    slug: "c24-bank-projektmanager-strategy",
    job: "Projektmanager (m/w/d) Strategy & Business Excellence – C24 Bank",
    profile:
      "Projekt- und Strategiemanager (M.Sc. Wirtschaftsinformatik, Note 1,5) mit über 6 Jahren Erfahrung in Beratung und Projektsteuerung – davon zwei Jahre in der BI-Beratung für Finanz- und Versicherungskunden. Erfahren in der Strukturierung und Steuerung von Projekten (zertifizierter Scrum Product Owner, Budgetverantwortung bis 500.000 €), der Erstellung von Management-Unterlagen, Business Cases und KPI-Dashboards sowie im Stakeholder-Management auf C-Level. Hohe Digital- und KI-Affinität aus produktiven Automatisierungs- und GenAI-Projekten.",
    focus: [
      "Financial-Services-Erfahrung: Datenanalysen und Reporting für Finanz- und Versicherungskunden (DataWorks AG)",
      "Strukturierung und Steuerung von Projekten inkl. PMO-Aufgaben, Scrum und Kanban",
      "Management-Unterlagen: Business Cases, Kosten-Nutzen-Analysen, KPI-Dashboards für C-Level",
      "Beratungshintergrund: IT-/Managementberatung und Inhouse-Schnittstellenfunktion",
      "Digital- und KI-Kompetenz: produktive GenAI- und Automatisierungslösungen mit messbarem ROI",
    ],
  },
];

const PROFILE_START = "## Profil\n\n";
const PROFILE_END = "\n\n## Berufserfahrung";
const profileStartIdx = base.indexOf(PROFILE_START) + PROFILE_START.length;
const profileEndIdx = base.indexOf(PROFILE_END);

for (const t of TAILORINGS) {
  const focusBlock = [
    `> **Optimiert für:** ${t.job}`,
    ">",
    "> Diese Version gewichtet vorhandene Erfahrungen auf die Stelle hin um – alle Fakten stammen unverändert aus dem Original-Lebenslauf.",
    "",
    "## Profil",
    "",
    t.profile,
    "",
    "## Relevante Schwerpunkte für diese Stelle",
    "",
    ...t.focus.map((f) => `- ${f}`),
  ].join("\n");
  const content =
    base.slice(0, base.indexOf("## Profil")) + focusBlock + base.slice(profileEndIdx);
  const file = path.join(DIR, `cv-job-${t.id}-${t.slug}.md`);
  writeFileSync(file, content, "utf-8");
  console.log(`${t.id}: ${file}`);
}
console.log(`${TAILORINGS.length} CV-Versionen erzeugt (profileStartIdx=${profileStartIdx}).`);
