import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { logger } from "../utils/logger.js";

/**
 * Dünner Playwright-Wrapper mit eingebautem Rate Limiting und robots.txt-Prüfung.
 * Defensive Grundhaltung: ein Browser, eine Seite, feste Wartezeit zwischen
 * Seitenaufrufen, keine Umgehung von Blockaden.
 */
export class PlaywrightClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private lastRequestAt = 0;
  private robotsCache = new Map<string, string>();

  constructor(
    private readonly options: { headless: boolean; requestDelayMs: number },
  ) {}

  async start(): Promise<void> {
    this.browser = await chromium.launch({ headless: this.options.headless });
    this.context = await this.browser.newContext({
      locale: "de-DE",
      viewport: { width: 1366, height: 900 },
    });
  }

  async newPage(): Promise<Page> {
    if (!this.context) throw new Error("Browser nicht gestartet – start() zuerst aufrufen.");
    return this.context.newPage();
  }

  /** Wartet das konfigurierte Rate Limit ab, bevor die nächste Seite geladen wird. */
  async politeGoto(page: Page, url: string): Promise<void> {
    const wait = this.lastRequestAt + this.options.requestDelayMs - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    this.lastRequestAt = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  }

  /**
   * Prüft robots.txt der Ziel-Domain für den User-Agent "*".
   * Liefert false, wenn der Pfad per Disallow gesperrt ist.
   */
  async isAllowedByRobots(url: string): Promise<boolean> {
    const u = new URL(url);
    const robotsUrl = `${u.origin}/robots.txt`;
    let robotsTxt = this.robotsCache.get(u.origin);
    if (robotsTxt === undefined) {
      try {
        const res = await fetch(robotsUrl);
        robotsTxt = res.ok ? await res.text() : "";
      } catch {
        robotsTxt = "";
      }
      this.robotsCache.set(u.origin, robotsTxt);
    }
    const rules = parseRobots(robotsTxt);
    const blocked = rules.some((dis) => dis !== "" && u.pathname.startsWith(dis));
    if (blocked) {
      logger.warn(`robots.txt von ${u.origin} verbietet ${u.pathname} – Aufruf wird übersprungen.`);
    }
    return !blocked;
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }
}

/** Extrahiert Disallow-Pfade für User-agent: * (bewusst einfach gehalten). */
export function parseRobots(robotsTxt: string): string[] {
  const disallows: string[] = [];
  let appliesToUs = false;
  for (const rawLine of robotsTxt.split("\n")) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const [keyRaw, ...rest] = line.split(":");
    if (!rest.length) continue;
    const key = keyRaw.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent") appliesToUs = value === "*";
    else if (key === "disallow" && appliesToUs) disallows.push(value);
  }
  return disallows;
}
