import { defineConfig } from "playwright/test";

// Die Anwendung nutzt Playwright als Bibliothek (src/browser/playwright-client.ts),
// nicht als Test-Runner. Diese Config existiert nur für eventuelle Portal-Tests.
export default defineConfig({
  testDir: "./tests/portals",
  timeout: 60_000,
  use: {
    headless: false,
    viewport: { width: 1366, height: 900 },
    locale: "de-DE",
  },
});
