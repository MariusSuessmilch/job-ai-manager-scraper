import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_BASE_URL: z.string().optional().default("https://api.openai.com/v1"),
  LLM_MODEL: z.string().optional().default("gpt-4o-mini"),
  STEPSTONE_BASE_URL: z.string().optional().default("https://www.stepstone.de"),
  DEFAULT_LOCATION: z.string().optional().default(""),
  DEFAULT_RADIUS_KM: z.coerce.number().optional().default(50),
  REMOTE_PREFERENCE: z.enum(["remote", "hybrid", "onsite", ""]).optional().default(""),
  ENABLE_HEADLESS: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  MAX_JOBS_PER_RUN: z.coerce.number().optional().default(50),
  REQUEST_DELAY_MS: z.coerce.number().optional().default(4000),
  DATABASE_URL: z.string().optional().default("./data/jobs.sqlite"),
  CV_FILE_PATH: z.string().optional().default(""),
  // Suchbegriffe (kommasepariert); leer/nicht gesetzt → DEFAULT_SEARCH_TERMS.
  SEARCH_TERMS: z.string().optional().default(""),
  // Bewerberdaten – nur lokal fürs Vorbefüllen von Formularen, niemals automatisch versendet.
  APPLICANT_FIRST_NAME: z.string().optional().default(""),
  APPLICANT_LAST_NAME: z.string().optional().default(""),
  APPLICANT_EMAIL: z.string().optional().default(""),
  APPLICANT_PHONE: z.string().optional().default(""),
});

export type AppConfig = z.infer<typeof envSchema> & {
  searchTerms: string[];
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
};

export const DEFAULT_SEARCH_TERMS = [
  "KI Manager",
  "AI Manager",
  "Artificial Intelligence Manager",
  "KI Projektmanager",
  "AI Consultant",
  "KI Transformation",
  "AI Transformation Manager",
  "KI Governance",
  "AI Governance Manager",
];

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Ungültige Konfiguration: ${parsed.error.message}`);
  }
  const searchTerms = parsed.data.SEARCH_TERMS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    ...parsed.data,
    searchTerms: searchTerms.length > 0 ? searchTerms : DEFAULT_SEARCH_TERMS,
    applicant: {
      firstName: parsed.data.APPLICANT_FIRST_NAME,
      lastName: parsed.data.APPLICANT_LAST_NAME,
      email: parsed.data.APPLICANT_EMAIL,
      phone: parsed.data.APPLICANT_PHONE,
    },
  };
}
