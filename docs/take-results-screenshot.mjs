import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const OUT = './docs/screenshots';

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Login
  await page.goto(`${BASE}/#/admin/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || 'admin@bemore.co.za');
  await page.fill('input[type="password"]', process.env.ADMIN_PASS || '');
  await page.click('button[type="submit"], .btn-primary');
  await page.waitForTimeout(2000);

  // Go to polls page
  await page.goto(`${BASE}/#/admin/polls`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click "View Results" on first poll that has it
  const resultsBtn = page.locator('[data-results]').first();
  if (await resultsBtn.count() > 0) {
    console.log('Clicking View Results...');
    await resultsBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/21-admin-poll-results.png`, fullPage: true });
    console.log('Captured results page');
  } else {
    console.log('No results button found — all polls may be in draft');
  }

  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
