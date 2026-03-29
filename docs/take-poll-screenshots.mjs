import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const BASE = 'http://localhost:3000';
const OUT = './docs/screenshots';

async function run() {
  await mkdir(OUT, { recursive: true });
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

  // Admin polls list
  console.log('Capturing admin polls list...');
  await page.goto(`${BASE}/#/admin/polls`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/18-admin-polls.png`, fullPage: true });

  // Public mentee meter (waiting state)
  console.log('Capturing mentee meter (waiting)...');
  await page.goto(`${BASE}/#/mentee-meter`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/19-mentee-meter-waiting.png`, fullPage: true });

  // Mobile mentee meter
  console.log('Capturing mobile mentee meter...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/20-mobile-mentee-meter.png`, fullPage: true });

  await browser.close();
  console.log('Done! Poll screenshots saved.');
}

run().catch(e => { console.error(e); process.exit(1); });
