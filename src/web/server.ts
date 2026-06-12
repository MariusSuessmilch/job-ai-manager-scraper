/**
 * KI-Job-Radar — lokaler Web-Hub für den Bewerbungs-Workflow.
 * Reiner node:http-Server, keine externen Web-Frameworks.
 * Start: npm run web  →  http://localhost:4317
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const PORT = 4317;
const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, 'data', 'jobs.sqlite');
const EXPORTS_DIR = path.join(ROOT, 'data', 'exports');
const CV_DIR = path.join(EXPORTS_DIR, 'cv-optimiert');
const PUBLIC_DIR = path.join(ROOT, 'src', 'web', 'public');

const ALLOWED_STATUS = [
  'gefunden', 'geprüft', 'interessant', 'nicht passend', 'vorbereitet',
  'beworben', 'Rückmeldung erhalten', 'erstes Gespräch', 'zweites Gespräch',
  'Absage', 'Angebot', 'zurückgezogen',
] as const;

const JOB_COLUMNS = [
  'id', 'portal', 'title', 'company', 'location', 'remote_option', 'url',
  'posted_at', 'scraped_at', 'status', 'score', 'score_reasoning',
  'score_breakdown', 'recommendation', 'cv_matches', 'gaps',
  'cv_optimization_suggestions', 'cover_letter_angles', 'must_criteria',
  'nice_criteria', 'incomplete', 'notes', 'last_checked_at',
].join(', ');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function openDb(writable = false): Database.Database {
  return new Database(DB_PATH, writable ? { fileMustExist: true } : { readonly: true, fileMustExist: true });
}

function parseJsonField(value: unknown, fallback: unknown): unknown {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Verzeichnisscan: Job-ID → Dateiname des optimierten CV (cv-job-<id>-*.md). */
function scanCvFiles(): Map<number, string> {
  const map = new Map<number, string>();
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(CV_DIR);
  } catch {
    return map;
  }
  for (const name of entries) {
    const m = /^cv-job-(\d+)-.+\.md$/.exec(name);
    if (m) map.set(Number(m[1]), name);
  }
  return map;
}

function hasDossier(jobId: number): boolean {
  return fs.existsSync(path.join(EXPORTS_DIR, `bewerbung-vorbereitung-job-${jobId}.md`));
}

function loadJobs(): Record<string, unknown>[] {
  const db = openDb();
  try {
    const rows = db
      .prepare(`SELECT ${JOB_COLUMNS} FROM jobs ORDER BY score IS NULL, score DESC, id ASC`)
      .all() as Record<string, unknown>[];
    const cvFiles = scanCvFiles();
    return rows.map((row) => ({
      ...row,
      score_breakdown: parseJsonField(row.score_breakdown, null),
      cv_matches: parseJsonField(row.cv_matches, []),
      gaps: parseJsonField(row.gaps, []),
      cv_optimization_suggestions: parseJsonField(row.cv_optimization_suggestions, []),
      cover_letter_angles: parseJsonField(row.cover_letter_angles, []),
      must_criteria: parseJsonField(row.must_criteria, []),
      nice_criteria: parseJsonField(row.nice_criteria, []),
      cvFile: cvFiles.get(row.id as number) ?? null,
      hasDossier: hasDossier(row.id as number),
    }));
  } finally {
    db.close();
  }
}

function buildStats(): Record<string, unknown> {
  const db = openDb();
  try {
    const rows = db
      .prepare('SELECT score, recommendation, status, scraped_at FROM jobs')
      .all() as { score: number | null; recommendation: string; status: string; scraped_at: string }[];

    const byRecommendation: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const scoreHistogram = new Array(10).fill(0);
    let scored = 0;
    let scoreSum = 0;
    let lastScrapedAt: string | null = null;

    for (const row of rows) {
      const rec = row.recommendation || 'unbewertet';
      byRecommendation[rec] = (byRecommendation[rec] ?? 0) + 1;
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      if (typeof row.score === 'number') {
        scored++;
        scoreSum += row.score;
        const bucket = Math.min(9, Math.max(0, Math.floor(row.score / 10)));
        scoreHistogram[bucket]++;
      }
      if (row.scraped_at && (!lastScrapedAt || row.scraped_at > lastScrapedAt)) {
        lastScrapedAt = row.scraped_at;
      }
    }

    return {
      total: rows.length,
      scored,
      byRecommendation,
      byStatus,
      avgScore: scored > 0 ? Math.round((scoreSum / scored) * 10) / 10 : null,
      lastScrapedAt,
      scoreHistogram,
    };
  } finally {
    db.close();
  }
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res: http.ServerResponse, status: number, text: string): void {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function serveStatic(res: http.ServerResponse, urlPath: string): void {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const resolved = path.resolve(PUBLIC_DIR, rel);
  // Path-Traversal verhindern: Datei muss innerhalb von PUBLIC_DIR liegen.
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) {
    sendText(res, 403, 'Zugriff verweigert');
    return;
  }
  let data: Buffer;
  try {
    data = fs.readFileSync(resolved);
  } catch {
    sendText(res, 404, 'Nicht gefunden');
    return;
  }
  const mime = MIME[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  res.end(data);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 64 * 1024) {
        reject(new Error('Body zu groß'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

async function handleStatusUpdate(req: http.IncomingMessage, res: http.ServerResponse, jobId: number): Promise<void> {
  let body: unknown;
  try {
    body = JSON.parse((await readBody(req)) || '{}');
  } catch {
    sendJson(res, 400, { error: 'Ungültiger JSON-Body' });
    return;
  }
  const status = (body as Record<string, unknown>)?.status;
  if (typeof status !== 'string' || !(ALLOWED_STATUS as readonly string[]).includes(status)) {
    sendJson(res, 400, { error: 'Ungültiger Status', allowed: ALLOWED_STATUS });
    return;
  }
  const db = openDb(true);
  try {
    const result = db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, jobId);
    if (result.changes === 0) {
      sendJson(res, 404, { error: `Job ${jobId} nicht gefunden` });
      return;
    }
    sendJson(res, 200, { ok: true, id: jobId, status });
  } finally {
    db.close();
  }
}

function handleCv(res: http.ServerResponse, jobId: number): void {
  const file = scanCvFiles().get(jobId);
  if (!file) {
    sendText(res, 404, `Kein optimierter Lebenslauf für Job ${jobId} vorhanden`);
    return;
  }
  try {
    sendText(res, 200, fs.readFileSync(path.join(CV_DIR, file), 'utf-8'));
  } catch {
    sendText(res, 500, 'CV-Datei konnte nicht gelesen werden');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const p = decodeURIComponent(url.pathname);
  try {
    if (req.method === 'GET' && p === '/api/jobs') {
      sendJson(res, 200, loadJobs());
      return;
    }
    if (req.method === 'GET' && p === '/api/stats') {
      sendJson(res, 200, buildStats());
      return;
    }
    const cvMatch = /^\/api\/cv\/(\d+)$/.exec(p);
    if (req.method === 'GET' && cvMatch) {
      handleCv(res, Number(cvMatch[1]));
      return;
    }
    const statusMatch = /^\/api\/jobs\/(\d+)\/status$/.exec(p);
    if (req.method === 'POST' && statusMatch) {
      await handleStatusUpdate(req, res, Number(statusMatch[1]));
      return;
    }
    if (req.method === 'GET') {
      serveStatic(res, p);
      return;
    }
    sendText(res, 405, 'Methode nicht erlaubt');
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Interner Serverfehler' });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`KI-Job-Radar läuft auf http://localhost:${PORT}`);
});
