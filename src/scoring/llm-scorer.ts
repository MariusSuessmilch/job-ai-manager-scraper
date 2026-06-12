import type { AppConfig } from "../config/config.js";
import type { CvProfile, JobDetails, JobScore } from "../types.js";
import { jobScoreSchema, recommendationForScore } from "../types.js";
import { logger } from "../utils/logger.js";

/**
 * Optionale semantische Bewertung über eine OpenAI-kompatible API.
 * Wird nur genutzt, wenn OPENAI_API_KEY gesetzt ist. Liefert die LLM-Antwort
 * validiert als JobScore zurück oder null (dann greift das regelbasierte Scoring).
 */
export async function scoreJobWithLlm(
  job: JobDetails,
  profile: CvProfile,
  config: AppConfig,
): Promise<JobScore | null> {
  if (!config.OPENAI_API_KEY) return null;

  const systemPrompt = `Du bewertest Stellenanzeigen für eine Person mit mehrjähriger Berufserfahrung
(Projektmanagement, Beratung, Führung, IT), die neu ein KI-Manager-Zertifikat erworben hat und ihre
erste dedizierte Rolle im KI-Management sucht. KEIN Junior-Profil. Reine Data-Scientist-/ML-Engineer-
oder sehr seniorige KI-Führungsrollen passen nicht.
Bewerte semantisch (nicht nur Keywords) mit diesen Teilscores:
role_fit 0-25, experience_level_fit 0-20, cv_match 0-25, technical_fit 0-10,
application_probability 0-10, location_fit 0-10.
Antworte NUR mit einem JSON-Objekt mit den Feldern: job_title, company, location, remote_option, url,
score_total, score_breakdown {role_fit, experience_level_fit, cv_match, technical_fit,
application_probability, location_fit}, recommendation ("bewerben"|"prüfen"|"eher nicht bewerben"),
reasoning, strong_matches[], gaps[], cv_optimization_suggestions[], cover_letter_angles[].
Erfinde keine Lebenslaufinhalte.`;

  const userPrompt = JSON.stringify({
    stelle: {
      titel: job.title,
      unternehmen: job.company,
      standort: job.location,
      remote: job.remoteOption,
      url: job.url,
      beschreibung: job.description.slice(0, 6000),
      anforderungen: job.requirements.slice(0, 3000),
    },
    lebenslauf_profil: {
      jahre_erfahrung: profile.yearsOfExperience,
      rollen: profile.roles,
      branchen: profile.industries,
      ki_kompetenzen: profile.aiSkills,
      it_kompetenzen: profile.itSkills,
      zertifikate: profile.certificates,
      ki_manager_zertifikat_erkannt: profile.hasAiManagerCertificate,
      fuehrung: profile.hasLeadershipExperience,
      projektmanagement: profile.hasProjectManagementExperience,
      beratung: profile.hasConsultingExperience,
      change_management: profile.hasChangeManagementExperience,
      schulung: profile.hasTrainingExperience,
      erfolge: profile.achievements,
    },
  });

  try {
    const response = await fetch(`${config.OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.LLM_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!response.ok) {
      logger.warn(`LLM-Scoring fehlgeschlagen (HTTP ${response.status}) – nutze regelbasiertes Scoring.`);
      return null;
    }
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = jobScoreSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      logger.warn(`LLM-Antwort nicht valide (${parsed.error.issues[0]?.message}) – nutze regelbasiertes Scoring.`);
      return null;
    }
    // Empfehlung konsistent zu den Schwellenwerten halten
    parsed.data.recommendation = recommendationForScore(parsed.data.score_total);
    return parsed.data;
  } catch (err) {
    logger.warn(`LLM-Scoring nicht erreichbar (${(err as Error).message}) – nutze regelbasiertes Scoring.`);
    return null;
  }
}
