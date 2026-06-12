/**
 * Zentrale Selektoren für Stepstone. Stepstone ändert sein Markup regelmäßig –
 * deshalb pro Element mehrere Kandidaten (werden der Reihe nach probiert).
 * Bei Änderungen nur diese Datei anpassen.
 */

export const stepstoneSelectors = {
  cookieAccept: [
    "#ccmgt_explicit_accept",
    'button[data-testid="uc-accept-all-button"]',
    'button:has-text("Alle akzeptieren")',
    'button:has-text("Alle Cookies akzeptieren")',
    'button:has-text("Akzeptieren")',
  ],
  jobItem: ['article[data-at="job-item"]', '[data-testid="job-item"]', "article[data-resultlist-element]"],
  jobItemTitle: ['[data-at="job-item-title"]', 'a[data-testid="job-item-title"]', "h2 a"],
  jobItemCompany: ['[data-at="job-item-company-name"]', '[data-testid="job-item-company-name"]'],
  jobItemLocation: ['[data-at="job-item-location"]', '[data-testid="job-item-location"]'],
  jobItemTimestamp: ['[data-at="job-item-timestamp"]', "time"],
  paginationNext: ['[data-at="pagination-next"]', 'a[aria-label="Nächste"]', 'a[rel="next"]'],
  detailTitle: ['[data-at="header-job-title"]', "h1"],
  detailCompany: ['[data-at="header-company-name"]', '[data-at="metadata-company-name"]'],
  detailLocation: ['[data-at="header-job-location"]', '[data-at="metadata-location"]'],
  detailContent: ['[data-at="job-ad-content"]', ".listing-content", "main"],
  detailWorkType: ['[data-at="header-work-type"]', '[data-at="metadata-work-type"]'],
  blockedIndicators: ['iframe[src*="captcha"]', "#challenge-form", 'h1:has-text("Access Denied")'],
};

export type StepstoneSelectors = typeof stepstoneSelectors;
