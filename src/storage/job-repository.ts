import type Database from "better-sqlite3";
import type { ApplicationStatus, JobDetails, JobScore, ScoreBreakdown, StoredJob } from "../types.js";

interface JobRow {
  id: number;
  portal: string;
  title: string;
  company: string;
  location: string;
  remote_option: string;
  url: string;
  posted_at: string;
  scraped_at: string;
  status: string;
  score: number | null;
  score_reasoning: string;
  score_breakdown: string | null;
  requirements: string;
  tasks: string;
  benefits: string;
  description: string;
  must_criteria: string;
  nice_criteria: string;
  cv_matches: string;
  gaps: string;
  cv_optimization_suggestions: string;
  cover_letter_angles: string;
  recommendation: string;
  notes: string;
  incomplete: number;
  last_checked_at: string;
}

function rowToJob(row: JobRow): StoredJob {
  return {
    id: row.id,
    portal: row.portal,
    title: row.title,
    company: row.company,
    location: row.location,
    remoteOption: row.remote_option,
    url: row.url,
    postedAt: row.posted_at,
    scrapedAt: row.scraped_at,
    status: row.status as ApplicationStatus,
    score: row.score,
    scoreReasoning: row.score_reasoning,
    scoreBreakdown: row.score_breakdown ? (JSON.parse(row.score_breakdown) as ScoreBreakdown) : null,
    requirements: row.requirements,
    tasks: row.tasks,
    benefits: row.benefits,
    description: row.description,
    mustCriteria: JSON.parse(row.must_criteria) as string[],
    niceToHaveCriteria: JSON.parse(row.nice_criteria) as string[],
    cvMatches: JSON.parse(row.cv_matches) as string[],
    gaps: JSON.parse(row.gaps) as string[],
    cvOptimizationSuggestions: JSON.parse(row.cv_optimization_suggestions) as string[],
    coverLetterAngles: JSON.parse(row.cover_letter_angles) as string[],
    recommendation: row.recommendation,
    notes: row.notes,
    incomplete: row.incomplete === 1,
    lastCheckedAt: row.last_checked_at,
  };
}

export class JobRepository {
  constructor(private readonly db: Database.Database) {}

  /** Speichert eine Stelle; Dubletten (gleiche URL) werden aktualisiert statt dupliziert. */
  upsertJob(details: JobDetails): { id: number; isNew: boolean } {
    const existing = this.db.prepare("SELECT id FROM jobs WHERE url = ?").get(details.url) as
      | { id: number }
      | undefined;
    const now = new Date().toISOString();
    if (existing) {
      this.db
        .prepare(
          `UPDATE jobs SET title=?, company=?, location=?, remote_option=?, posted_at=?,
           requirements=?, tasks=?, benefits=?, description=?, incomplete=?, last_checked_at=? WHERE id=?`,
        )
        .run(
          details.title,
          details.company,
          details.location,
          details.remoteOption,
          details.postedAt,
          details.requirements,
          details.tasks,
          details.benefits,
          details.description,
          details.incomplete ? 1 : 0,
          now,
          existing.id,
        );
      return { id: existing.id, isNew: false };
    }
    const result = this.db
      .prepare(
        `INSERT INTO jobs (portal, title, company, location, remote_option, url, posted_at,
         scraped_at, requirements, tasks, benefits, description, incomplete, last_checked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        details.portal,
        details.title,
        details.company,
        details.location,
        details.remoteOption,
        details.url,
        details.postedAt,
        now,
        details.requirements,
        details.tasks,
        details.benefits,
        details.description,
        details.incomplete ? 1 : 0,
        now,
      );
    return { id: Number(result.lastInsertRowid), isNew: true };
  }

  saveScore(jobId: number, score: JobScore, mustCriteria: string[], niceToHaveCriteria: string[]): void {
    this.db
      .prepare(
        `UPDATE jobs SET score=?, score_reasoning=?, score_breakdown=?, recommendation=?,
         cv_matches=?, gaps=?, cv_optimization_suggestions=?, cover_letter_angles=?,
         must_criteria=?, nice_criteria=?, status=CASE WHEN status='gefunden' THEN 'geprüft' ELSE status END,
         last_checked_at=? WHERE id=?`,
      )
      .run(
        score.score_total,
        score.reasoning,
        JSON.stringify(score.score_breakdown),
        score.recommendation,
        JSON.stringify(score.strong_matches),
        JSON.stringify(score.gaps),
        JSON.stringify(score.cv_optimization_suggestions),
        JSON.stringify(score.cover_letter_angles),
        JSON.stringify(mustCriteria),
        JSON.stringify(niceToHaveCriteria),
        new Date().toISOString(),
        jobId,
      );
  }

  setStatus(jobId: number, status: ApplicationStatus, notes?: string): void {
    if (notes !== undefined) {
      this.db.prepare("UPDATE jobs SET status=?, notes=? WHERE id=?").run(status, notes, jobId);
    } else {
      this.db.prepare("UPDATE jobs SET status=? WHERE id=?").run(status, jobId);
    }
  }

  hasUrl(url: string): boolean {
    return this.db.prepare("SELECT 1 FROM jobs WHERE url = ?").get(url) !== undefined;
  }

  listAll(): StoredJob[] {
    const rows = this.db.prepare("SELECT * FROM jobs ORDER BY score DESC NULLS LAST, id").all() as JobRow[];
    return rows.map(rowToJob);
  }

  listUnscored(): StoredJob[] {
    const rows = this.db.prepare("SELECT * FROM jobs WHERE score IS NULL").all() as JobRow[];
    return rows.map(rowToJob);
  }
}
