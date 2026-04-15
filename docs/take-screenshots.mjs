import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const BASE = 'http://localhost:3000';
const OUT = './docs/screenshots';

const pages = [
  { name: '01-hero', url: '/#/', wait: 1500 },
  { name: '02-landing-qr', url: '/#/landing', wait: 1000 },
  { name: '03-gateway', url: '/#/gateway', wait: 1000 },
  { name: '04-about', url: '/#/about', wait: 1000 },
  { name: '05-mentee-meter', url: '/#/mentee-meter', wait: 1000 },
  { name: '06-status-lookup', url: '/#/status', wait: 1000 },
  { name: '07-admin-login', url: '/#/admin/login', wait: 1000 },
];

const adminPages = [
  { name: '08-admin-dashboard', url: '/#/admin/dashboard', wait: 2000 },
  { name: '09-admin-leads', url: '/#/admin/leads', wait: 2000 },
  { name: '10-admin-analytics', url: '/#/admin/analytics', wait: 2500 },
  { name: '11-admin-reports', url: '/#/admin/reports', wait: 1500 },
  { name: '12-admin-dealroom', url: '/#/admin/deal-room', wait: 2000 },
  { name: '13-admin-auditlog', url: '/#/admin/audit-log', wait: 2000 },
  { name: '14-admin-qr', url: '/#/admin/qr', wait: 1500 },
  { name: '15-admin-guide', url: '/#/admin/guide', wait: 1500 },
  { name: '18-admin-polls', url: '/#/admin/polls', wait: 2000 },
  { name: '21-admin-settings', url: '/#/admin/settings', wait: 1500 },
];

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Public pages
  for (const p of pages) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(`${BASE}${p.url}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(p.wait);
    await page.screenshot({ path: `${OUT}/${p.name}.png`, fullPage: true });
  }

  // Login to admin
  console.log('Logging into admin...');
  await page.goto(`${BASE}/#/admin/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || 'admin@bemore.co.za');
  await page.fill('input[type="password"]', process.env.ADMIN_PASS || '');
  await page.click('button[type="submit"], .btn-primary');
  await page.waitForTimeout(2000);

  // Admin pages
  for (const p of adminPages) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(`${BASE}${p.url}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(p.wait);
    await page.screenshot({ path: `${OUT}/${p.name}.png`, fullPage: true });
  }

  // Mobile screenshots (key pages)
  console.log('Capturing mobile views...');
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/16-mobile-hero.png`, fullPage: true });

  await page.goto(`${BASE}/#/landing`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/17-mobile-landing.png`, fullPage: true });

  await browser.close();
  console.log(`Done! ${pages.length + adminPages.length + 2} screenshots saved to ${OUT}/`);
}

run().catch(e => { console.error(e); process.exit(1); });
