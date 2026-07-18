"""
Batch-capture ERP page screenshots from the live deployment.
Run: python docs/capture_erp_screenshots.py
Requires: pip install playwright && playwright install chromium
"""

import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "https://shri-hari-jewels.vercel.app"
OUT = Path(__file__).parent / "screenshots" / "erp"
EMAIL = "admin@shreehari.com"
PASSWORD = "admin123"

# (filename, path, wait_for_text_substring or None)
PAGES = [
    ("erp-01-dashboard", "/dashboard", "Dashboard"),
    ("erp-02-inventory", "/inventory", "Stock"),
    ("erp-03-add-stock", "/inventory/new", "Add"),
    ("erp-04-entry-verification", "/entry-verification", "Entry"),
    ("erp-05-raw-inventory", "/raw-inventory", "Metal"),
    ("erp-06-scan-send", "/stock-transfer", "Scan"),
    ("erp-07-sent-transfers", "/stock-transfer/sent", "Sent"),
    ("erp-08-proforma", "/stock-transfer/proforma", "Proforma"),
    ("erp-09-incoming", "/stock-transfer/incoming", "Incoming"),
    ("erp-10-sales", "/sales", "Sales"),
    ("erp-11-orders", "/orders", "Order"),
    ("erp-12-new-order", "/orders/new", "Customer"),
    ("erp-13-customers", "/customers", "Customer"),
    ("erp-14-invoices", "/invoices", "Invoice"),
    ("erp-15-designs", "/designs", "Design"),
    ("erp-16-new-design", "/designs/new", "Design"),
    ("erp-17-motifs", "/motifs", "Motif"),
    ("erp-18-work-orders", "/work-orders", "Work"),
    ("erp-19-production-runs", "/production-runs", "Production"),
    ("erp-20-new-production-run", "/production-runs/new", "Production"),
    ("erp-21-production-board", "/production-runs/dashboard", "Production"),
    ("erp-22-karigar-settlements", "/karigar-settlements", "Karigar"),
    ("erp-23-sales-analytics", "/sales-analytics", "Sales"),
    ("erp-24-gst-report", "/reports/gst", "GST"),
    ("erp-25-stock-valuation", "/reports/stock-valuation", "Stock"),
    ("erp-26-ageing-stock", "/reports/ageing-stock", "Ageing"),
    ("erp-27-staff-performance", "/reports/staff-performance", "Staff"),
    ("erp-28-storefront", "/storefront", "Online Store"),
    ("erp-29-store-settings", "/storefront/settings", "Store"),
    ("erp-30-publish-products", "/storefront/products", "Publish"),
    ("erp-31-web-orders", "/storefront/orders", "Web"),
    ("erp-32-branches", "/branches", "Branch"),
    ("erp-33-settings", "/settings", "Settings"),
]

SHOP_PAGES = [
    ("shop-01-home", "/shop/shree-hari-jewels", "Shree Hari"),
    ("shop-02-products", "/shop/shree-hari-jewels/products", "Shop All"),
    ("shop-03-cart", "/shop/shree-hari-jewels/cart", "Cart"),
    ("shop-04-checkout", "/shop/shree-hari-jewels/checkout", "Checkout"),
]


async def login(page):
    await page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=90000)
    await page.wait_for_timeout(2000)
    await page.locator('input[type="text"], input[placeholder*="example"]').first.fill(EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('button:has-text("Sign in")').click()
    await page.wait_for_url("**/dashboard**", timeout=60000)
    await page.wait_for_timeout(2000)


async def capture(page, name, path, wait_text=None, auth=True):
    url = f"{BASE}{path}"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=90000)
        await page.wait_for_timeout(3000)
        if wait_text:
            try:
                await page.wait_for_function(
                    f"document.body.innerText.includes({wait_text!r})",
                    timeout=20000,
                )
            except Exception:
                pass
        await page.wait_for_timeout(1000)
        out = OUT / f"{name}.png"
        await page.screenshot(path=str(out), full_page=True)
        print(f"  OK  {name}")
        return True
    except Exception as e:
        print(f"  FAIL {name}: {e}")
        return False


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        print("Logging in...")
        await login(page)

        print("Capturing ERP pages...")
        for name, path, wait in PAGES:
            await capture(page, name, path, wait)

        print("Capturing shop pages (no auth)...")
        shop_ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        shop_page = await shop_ctx.new_page()
        for name, path, wait in SHOP_PAGES:
            await capture(shop_page, name, path, wait, auth=False)

        await browser.close()
    print(f"\nDone. Screenshots in {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
