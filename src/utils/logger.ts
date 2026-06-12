const LEVELS = ["debug", "info", "warn", "error"] as const;
type Level = (typeof LEVELS)[number];

const minLevel: Level = (process.env.LOG_LEVEL as Level) || "info";

function log(level: Level, message: string, ...args: unknown[]): void {
  if (LEVELS.indexOf(level) < LEVELS.indexOf(minLevel)) return;
  const ts = new Date().toISOString();
  // Hinweis: niemals Lebenslauf-Volltexte loggen (Datenschutz).
  const line = `[${ts}] [${level.toUpperCase()}] ${message}`;
  if (level === "error") console.error(line, ...args);
  else if (level === "warn") console.warn(line, ...args);
  else console.log(line, ...args);
}

export const logger = {
  debug: (msg: string, ...args: unknown[]) => log("debug", msg, ...args),
  info: (msg: string, ...args: unknown[]) => log("info", msg, ...args),
  warn: (msg: string, ...args: unknown[]) => log("warn", msg, ...args),
  error: (msg: string, ...args: unknown[]) => log("error", msg, ...args),
};
