import { chromium } from "playwright";

const base = "http://localhost:4317";
const html = await (await fetch(base + "/")).text();
console.log("HTML enthält KI-Job-Radar:", html.includes("KI-Job-Radar"));
const jobs = (await (await fetch(base + "/api/jobs")).json()) as { cvFile: string | null }[];
console.log("Jobs:", jobs.length, "| mit CV:", jobs.filter((j) => j.cvFile).length);
const stats = await (await fetch(base + "/api/stats")).json();
console.log("Stats:", JSON.stringify(stats).slice(0, 220));
const cv = await (await fetch(base + "/api/cv/8")).text();
console.log("CV Job 8 enthält Jonas Berger:", cv.includes("Jonas Berger"));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "data/exports/hub-screenshot.png" });
// CV-Overlay öffnen und screenshotten
const cvBtn = page.locator("[data-cv], .cv-btn, button:has-text('CV')").first();
if (await cvBtn.isVisible().catch(() => false)) {
  await cvBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "data/exports/hub-cv-overlay.png" });
  console.log("CV-Overlay-Screenshot erstellt.");
}
await browser.close();
console.log("Screenshots gespeichert.");
