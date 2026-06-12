import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export function openDatabase(dbPath: string): Database.Database {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portal TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      remote_option TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL UNIQUE,
      posted_at TEXT NOT NULL DEFAULT '',
      scraped_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'gefunden',
      score INTEGER,
      score_reasoning TEXT NOT NULL DEFAULT '',
      score_breakdown TEXT,
      requirements TEXT NOT NULL DEFAULT '',
      tasks TEXT NOT NULL DEFAULT '',
      benefits TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      must_criteria TEXT NOT NULL DEFAULT '[]',
      nice_criteria TEXT NOT NULL DEFAULT '[]',
      cv_matches TEXT NOT NULL DEFAULT '[]',
      gaps TEXT NOT NULL DEFAULT '[]',
      cv_optimization_suggestions TEXT NOT NULL DEFAULT '[]',
      cover_letter_angles TEXT NOT NULL DEFAULT '[]',
      recommendation TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      incomplete INTEGER NOT NULL DEFAULT 0,
      last_checked_at TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  `);
  return db;
}
