import { loadConfig, type AppConfig } from "./config/config.js";
import { parseCv, CvMissingError } from "./cv/parse-cv.js";
import { PlaywrightClient } from "./browser/playwright-client.js";
import { StepstoneAdapter, PortalBlockedError } from "./portals/stepstone/stepstone.adapter.js";
import { openDatabase } from "./storage/sqlite.js";
import { JobRepository } from "./storage/job-repository.js";
import { scoreJob } from "./scoring/score-job.js";
import { scoreJobWithLlm } from "./scoring/llm-scorer.js";
import { extractCriteria } from "./scoring/score-job.js";
import { exportCsv, exportMarkdownReport, buildMarkdownReport } from "./utils/export.js";
import { logger } from "./utils/logger.js";
import type { CvProfile, JobDetails } from "./types.js";

const EXPORT_DIR = "./data/exports";

async function loadCvOrExit(config: AppConfig): Promise<CvProfile> {
  const cvPath = process.env.CV_FILE_PATH || config.CV_FILE_PATH;
  try {
    return await parseCv(cvPath);
  } catch (err) {
    if (err instanceof CvMissingError) {
      console.error(`\n${err.message}\n`);
      console.error("Setze CV_FILE_PATH in der .env auf deine Lebenslauf-Datei (PDF, DOCX, MD oder TXT).");
      process.exit(1);
    }
    throw err;
  }
}

async function scoreAndStore(details: JobDetails, profile: CvProfile, config: AppConfig, repo: JobRepository): Promise<number> {
  const { id } = repo.upsertJob(details);
  const pref = { location: config.DEFAULT_LOCATION, remote: config.REMOTE_PREFERENCE };
  // LLM-Scoring (falls konfiguriert), sonst regelbasiert – beides validiert.
  const llmScore = await scoreJobWithLlm(details, profile, config);
  if (llmScore) {
    const { must, nice } = extractCriteria(details.requirements || details.description);
    repo.saveScore(id, llmScore, must, nice);
    return llmScore.score_total;
  }
  const result = scoreJob(details, profile, pref);
  repo.saveScore(id, result.score, result.mustCriteria, result.niceToHaveCriteria);
  return result.score.score_total;
}

async function commandScrape(config: AppConfig): Promise<void> {
  const profile = await loadCvOrExit(config);
  const db = openDatabase(config.DATABASE_URL);
  const repo = new JobRepository(db);
  const client = new PlaywrightClient({ headless: config.ENABLE_HEADLESS, requestDelayMs: config.REQUEST_DELAY_MS });
  await client.start();
  const adapter = new StepstoneAdapter(client, config.STEPSTONE_BASE_URL);

  let totalNew = 0;
  try {
    for (const term of config.searchTerms) {
      if (totalNew >= config.MAX_JOBS_PER_RUN) break;
      const listings = await adapter.searchJobs({
        searchTerm: term,
        location: config.DEFAULT_LOCATION || undefined,
        radiusKm: config.DEFAULT_RADIUS_KM,
        remote: config.REMOTE_PREFERENCE,
        maxResults: Math.min(15, config.MAX_JOBS_PER_RUN - totalNew),
      });
      for (const listing of listings) {
        if (totalNew >= config.MAX_JOBS_PER_RUN) break;
        if (repo.hasUrl(listing.url)) {
          logger.debug(`Dublette übersprungen: ${listing.url}`);
          continue;
        }
        try {
          const details = await adapter.fetchJobDetails(listing.url);
          details.postedAt = details.postedAt || listing.postedAt;
          details.location = details.location || listing.location;
          details.company = details.company === "unbekannt" ? listing.company : details.company;
          const score = await scoreAndStore(details, profile, config, repo);
          totalNew += 1;
          logger.info(`Bewertet (${score}/100): ${details.title} – ${details.company}`);
        } catch (err) {
          if (err instanceof PortalBlockedError) throw err;
          logger.warn(`Detailseite fehlgeschlagen (${listing.url}): ${(err as Error).message}`);
        }
      }
    }
  } catch (err) {
    if (err instanceof PortalBlockedError) {
      logger.error(err.message);
      process.exitCode = 2;
    } else {
      throw err;
    }
  } finally {
    await client.close();
  }

  const all = repo.listAll();
  const csv = exportCsv(all, EXPORT_DIR);
  const report = exportMarkdownReport(all, EXPORT_DIR);
  logger.info(`${totalNew} neue Stellen gespeichert. Export: ${csv}, ${report}`);
  console.log("\n" + buildMarkdownReport(all));
}

async function commandScore(config: AppConfig): Promise<void> {
  const profile = await loadCvOrExit(config);
  const db = openDatabase(config.DATABASE_URL);
  const repo = new JobRepository(db);
  const jobs = repo.listAll();
  if (jobs.length === 0) {
    console.log("Keine gespeicherten Stellen. Führe zuerst `npm run scrape` aus.");
    return;
  }
  for (const job of jobs) {
    const details: JobDetails = {
      portal: job.portal,
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      postedAt: job.postedAt,
      description: job.description,
      requirements: job.requirements,
      tasks: job.tasks,
      benefits: job.benefits,
      remoteOption: job.remoteOption,
      incomplete: job.incomplete,
    };
    const score = await scoreAndStore(details, profile, config, repo);
    logger.info(`Neu bewertet (${score}/100): ${job.title} – ${job.company}`);
  }
  exportCsv(repo.listAll(), EXPORT_DIR);
  exportMarkdownReport(repo.listAll(), EXPORT_DIR);
  console.log("\n" + buildMarkdownReport(repo.listAll()));
}

async function commandReport(config: AppConfig): Promise<void> {
  const db = openDatabase(config.DATABASE_URL);
  const repo = new JobRepository(db);
  const all = repo.listAll();
  const csv = exportCsv(all, EXPORT_DIR);
  const report = exportMarkdownReport(all, EXPORT_DIR);
  logger.info(`Export aktualisiert: ${csv}, ${report}`);
  console.log("\n" + buildMarkdownReport(all));
}

async function commandCv(config: AppConfig): Promise<void> {
  const profile = await loadCvOrExit(config);
  const { rawText, ...summary } = profile;
  console.log(JSON.stringify({ ...summary, rawTextLength: rawText.length }, null, 2));
  if (!profile.hasAiManagerCertificate) {
    console.log(
      "\nHinweis: Im Lebenslauf wurde kein KI-Manager-Zertifikat (z. B. IHK) erkannt – offene Information.",
    );
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "scrape";
  const config = loadConfig();
  switch (command) {
    case "scrape":
      return commandScrape(config);
    case "score":
      return commandScore(config);
    case "report":
      return commandReport(config);
    case "cv":
      return commandCv(config);
    default:
      console.error(`Unbekannter Befehl: ${command}. Verfügbar: scrape | score | report | cv`);
      process.exit(1);
  }
}

main().catch((err) => {
  logger.error((err as Error).message);
  process.exit(1);
});
