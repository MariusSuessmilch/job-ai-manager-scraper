import type { Locator, Page } from "playwright";
import type { JobDetails, JobListing, JobPortalAdapter, JobSearchQuery } from "../../types.js";
import { jobDetailsSchema, jobListingSchema } from "../../types.js";
import type { PlaywrightClient } from "../../browser/playwright-client.js";
import { logger } from "../../utils/logger.js";
import { buildSearchUrl, detectRemoteOption, parseJobSections } from "./stepstone.parser.js";
import { stepstoneSelectors as sel } from "./stepstone.selectors.js";

/**
 * Wird geworfen, wenn Stepstone den Zugriff technisch blockiert (Captcha,
 * Access Denied) oder robots.txt den Pfad verbietet. Die Anwendung schlägt
 * dann sauber fehl – Alternativen sind in AUTOMATION.md dokumentiert.
 */
export class PortalBlockedError extends Error {
  constructor(portal: string, reason: string) {
    super(
      `${portal} ist aktuell nicht automatisiert nutzbar (${reason}). ` +
        `Alternativen: manuelle Suche mit Export, Browser-gestützte Nutzung oder spätere API-/Partner-Integration ` +
        `(siehe AUTOMATION.md, Abschnitt "Wenn Stepstone blockiert").`,
    );
    this.name = "PortalBlockedError";
  }
}

async function firstVisible(page: Page, selectors: string[]): Promise<Locator | null> {
  for (const s of selectors) {
    const loc = page.locator(s).first();
    if (await loc.isVisible().catch(() => false)) return loc;
  }
  return null;
}

async function textFrom(scope: Page | Locator, selectors: string[]): Promise<string> {
  for (const s of selectors) {
    const loc = scope.locator(s).first();
    if ((await loc.count().catch(() => 0)) > 0) {
      const text = await loc.textContent().catch(() => null);
      if (text?.trim()) return text.trim();
    }
  }
  return "";
}

export class StepstoneAdapter implements JobPortalAdapter {
  readonly name = "Stepstone";

  constructor(
    private readonly client: PlaywrightClient,
    private readonly baseUrl: string,
  ) {}

  /** Cookie-Banner erkennen und ablehnen/akzeptieren, ohne den Flow zu brechen. */
  private async handleCookieBanner(page: Page): Promise<void> {
    const button = await firstVisible(page, sel.cookieAccept);
    if (button) {
      await button.click().catch(() => logger.debug("Cookie-Banner-Klick fehlgeschlagen – ignoriert."));
      await page.waitForTimeout(800);
    }
  }

  private async assertNotBlocked(page: Page): Promise<void> {
    for (const s of sel.blockedIndicators) {
      if ((await page.locator(s).count().catch(() => 0)) > 0) {
        throw new PortalBlockedError(this.name, "Captcha/Zugriffssperre erkannt – wird nicht umgangen");
      }
    }
  }

  async searchJobs(query: JobSearchQuery): Promise<JobListing[]> {
    const url = buildSearchUrl(this.baseUrl, query.searchTerm, query.location, query.radiusKm);
    if (!(await this.client.isAllowedByRobots(url))) {
      throw new PortalBlockedError(this.name, `robots.txt verbietet ${new URL(url).pathname}`);
    }

    const page = await this.client.newPage();
    const listings: JobListing[] = [];
    try {
      logger.info(`Stepstone-Suche: "${query.searchTerm}"${query.location ? ` in ${query.location}` : ""}`);
      await this.client.politeGoto(page, url);
      await this.handleCookieBanner(page);
      await this.assertNotBlocked(page);

      let pageNum = 1;
      while (listings.length < query.maxResults) {
        const itemSelector = sel.jobItem.join(", ");
        await page.waitForSelector(itemSelector, { timeout: 15_000 }).catch(() => null);
        const items = await page.locator(itemSelector).all();
        if (items.length === 0) {
          logger.warn(`Keine Treffer-Elemente auf Seite ${pageNum} gefunden (Markup geändert oder 0 Treffer).`);
          break;
        }

        for (const item of items) {
          if (listings.length >= query.maxResults) break;
          const titleLoc = item.locator(sel.jobItemTitle.join(", ")).first();
          const title = (await titleLoc.textContent().catch(() => null))?.trim() ?? "";
          let href = (await titleLoc.getAttribute("href").catch(() => null)) ?? "";
          if (!title || !href) continue;
          if (href.startsWith("/")) href = `${this.baseUrl}${href}`;
          const parsed = jobListingSchema.safeParse({
            portal: this.name,
            title,
            company: (await textFrom(item, sel.jobItemCompany)) || "unbekannt",
            location: await textFrom(item, sel.jobItemLocation),
            url: href.split("?")[0],
            postedAt: await textFrom(item, sel.jobItemTimestamp),
          });
          if (parsed.success && !listings.some((l) => l.url === parsed.data.url)) {
            listings.push(parsed.data);
          }
        }

        const next = await firstVisible(page, sel.paginationNext);
        if (!next || listings.length >= query.maxResults) break;
        pageNum += 1;
        logger.info(`Weiter zu Ergebnisseite ${pageNum} …`);
        await page.waitForTimeout(1000);
        await next.click();
        await page.waitForLoadState("domcontentloaded");
        await this.assertNotBlocked(page);
      }
      logger.info(`"${query.searchTerm}": ${listings.length} Stellen gefunden.`);
      return listings;
    } finally {
      await page.close();
    }
  }

  async fetchJobDetails(url: string): Promise<JobDetails> {
    if (!(await this.client.isAllowedByRobots(url))) {
      throw new PortalBlockedError(this.name, `robots.txt verbietet ${new URL(url).pathname}`);
    }
    const page = await this.client.newPage();
    try {
      await this.client.politeGoto(page, url);
      await this.handleCookieBanner(page);
      await this.assertNotBlocked(page);

      const title = await textFrom(page, sel.detailTitle);
      const contentLoc = await firstVisible(page, sel.detailContent);
      const description = contentLoc ? ((await contentLoc.innerText().catch(() => "")) ?? "") : "";
      const sections = parseJobSections(description);
      const incomplete = !title || description.length < 200;
      if (incomplete) {
        logger.warn(`Anzeige unvollständig ausgelesen: ${url} – wird als "unvollständig geprüft" markiert.`);
      }

      return jobDetailsSchema.parse({
        portal: this.name,
        title: title || "unbekannter Titel",
        company: (await textFrom(page, sel.detailCompany)) || "unbekannt",
        location: await textFrom(page, sel.detailLocation),
        url,
        postedAt: "",
        description,
        tasks: sections.tasks,
        requirements: sections.requirements,
        benefits: sections.benefits,
        remoteOption: detectRemoteOption(`${await textFrom(page, sel.detailWorkType)} ${description}`),
        incomplete,
      });
    } finally {
      await page.close();
    }
  }
}
