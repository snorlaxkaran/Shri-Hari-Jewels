/**
 * Capture marketing screenshots after data has loaded (avoids skeleton states).
 * Usage: node scripts/capture-marketing-screenshots.mjs
 * Requires: client dev server on :3000, server on :4000, seeded DB.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/onboarding");
const BASE = process.env.MARKETING_BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  { file: "inventory.png", path: "/inventory", waitFor: "text=All stock" },
  { file: "production.png", path: "/production-runs", waitFor: "text=Production runs" },
  { file: "customers.png", path: "/customers", waitFor: "text=Customers" },
  { file: "stock-transfer.png", path: "/stock-transfer", waitFor: "text=Scan" },
  { file: "purchase-bills.png", path: "/purchase-bills", waitFor: "text=Purchase" },
  { file: "hallmark.png", path: "/hallmark", waitFor: "text=Hallmark" },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"], input[name="email"]', "admin@shreehari.com");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|setup|inventory)/, { timeout: 30000 });

  for (const route of ROUTES) {
    console.log(`Capturing ${route.file}…`);
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector(route.waitFor, { timeout: 15000 });
    } catch {
      console.warn(`  Warning: selector "${route.waitFor}" not found, capturing anyway`);
    }
    // Wait for skeleton to disappear
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT_DIR, route.file),
      fullPage: false,
    });
    console.log(`  Saved ${route.file}`);
  }

  await browser.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
