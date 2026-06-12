import { z } from "zod";

// ---------------------------------------------------------------------------
// Suche
// ---------------------------------------------------------------------------

export interface JobSearchQuery {
  searchTerm: string;
  location?: string;
  radiusKm?: number;
  remote?: "remote" | "hybrid" | "onsite" | "";
  maxResults: number;
}

// ---------------------------------------------------------------------------
// Stellenanzeigen
// ---------------------------------------------------------------------------

export const jobListingSchema = z.object({
  portal: z.string(),
  title: z.string().min(1),
  company: z.string().default("unbekannt"),
  location: z.string().default(""),
  url: z.string().url(),
  postedAt: z.string().default(""),
});
export type JobListing = z.infer<typeof jobListingSchema>;

export const jobDetailsSchema = jobListingSchema.extend({
  description: z.string().default(""),
  requirements: z.string().default(""),
  tasks: z.string().default(""),
  benefits: z.string().default(""),
  remoteOption: z.string().default(""),
  incomplete: z.boolean().default(false),
});
export type JobDetails = z.infer<typeof jobDetailsSchema>;

// ---------------------------------------------------------------------------
// Portal-Adapter
// ---------------------------------------------------------------------------

export interface JobPortalAdapter {
  name: string;
  searchJobs(query: JobSearchQuery): Promise<JobListing[]>;
  fetchJobDetails(url: string): Promise<JobDetails>;
}

// ---------------------------------------------------------------------------
// Lebenslauf
// ---------------------------------------------------------------------------

export const cvProfileSchema = z.object({
  rawText: z.string(),
  sourceFile: z.string(),
  yearsOfExperience: z.number().nullable(),
  roles: z.array(z.string()),
  industries: z.array(z.string()),
  hasLeadershipExperience: z.boolean(),
  hasProjectManagementExperience: z.boolean(),
  hasConsultingExperience: z.boolean(),
  hasChangeManagementExperience: z.boolean(),
  hasTrainingExperience: z.boolean(),
  itSkills: z.array(z.string()),
  aiSkills: z.array(z.string()),
  certificates: z.array(z.string()),
  hasAiManagerCertificate: z.boolean(),
  education: z.array(z.string()),
  languages: z.array(z.string()),
  achievements: z.array(z.string()),
});
export type CvProfile = z.infer<typeof cvProfileSchema>;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export const scoreBreakdownSchema = z.object({
  role_fit: z.number().min(0).max(25),
  experience_level_fit: z.number().min(0).max(20),
  cv_match: z.number().min(0).max(25),
  technical_fit: z.number().min(0).max(10),
  application_probability: z.number().min(0).max(10),
  location_fit: z.number().min(0).max(10),
});
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const recommendationSchema = z.enum(["bewerben", "prüfen", "eher nicht bewerben"]);
export type Recommendation = z.infer<typeof recommendationSchema>;

export const jobScoreSchema = z.object({
  job_title: z.string(),
  company: z.string(),
  location: z.string(),
  remote_option: z.string(),
  url: z.string(),
  score_total: z.number().min(0).max(100),
  score_breakdown: scoreBreakdownSchema,
  recommendation: recommendationSchema,
  reasoning: z.string(),
  strong_matches: z.array(z.string()),
  gaps: z.array(z.string()),
  cv_optimization_suggestions: z.array(z.string()),
  cover_letter_angles: z.array(z.string()),
});
export type JobScore = z.infer<typeof jobScoreSchema>;

export function recommendationForScore(total: number): Recommendation {
  if (total >= 70) return "bewerben";
  if (total >= 55) return "prüfen";
  return "eher nicht bewerben";
}

export function recommendationLabel(total: number): string {
  if (total >= 85) return "Sehr gute Passung, Bewerbung klar empfohlen";
  if (total >= 70) return "Gute Passung, Bewerbung empfohlen";
  if (total >= 55) return "Möglich, aber genauer prüfen";
  if (total >= 40) return "Schwache Passung, nur bei besonderem Interesse";
  return "Nicht empfohlen";
}

// ---------------------------------------------------------------------------
// Datenhaltung
// ---------------------------------------------------------------------------

export const applicationStatusValues = [
  "gefunden",
  "geprüft",
  "interessant",
  "nicht passend",
  "vorbereitet",
  "beworben",
  "Rückmeldung erhalten",
  "erstes Gespräch",
  "zweites Gespräch",
  "Absage",
  "Angebot",
  "zurückgezogen",
] as const;
export type ApplicationStatus = (typeof applicationStatusValues)[number];

export interface StoredJob {
  id: number;
  portal: string;
  title: string;
  company: string;
  location: string;
  remoteOption: string;
  url: string;
  postedAt: string;
  scrapedAt: string;
  status: ApplicationStatus;
  score: number | null;
  scoreReasoning: string;
  requirements: string;
  tasks: string;
  benefits: string;
  mustCriteria: string[];
  niceToHaveCriteria: string[];
  cvMatches: string[];
  gaps: string[];
  recommendation: string;
  notes: string;
  lastCheckedAt: string;
  description: string;
  scoreBreakdown: ScoreBreakdown | null;
  cvOptimizationSuggestions: string[];
  coverLetterAngles: string[];
  incomplete: boolean;
}
