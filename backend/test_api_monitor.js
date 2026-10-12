const { chromium } = require('playwright');
const FRONTEND = 'https://replymindai.netlify.app';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Monitor all API calls
  page.on('request', req => {
    const url = req.url();
    if (url.includes('api') || url.includes('railway') || url.includes('supabase')) {
      console.log(`[REQ] ${req.method()} ${url}`);
    }
  });
  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('api') || url.includes('railway') || url.includes('supabase')) {
      console.log(`[RES] ${resp.status()} ${url}`);
    }
  });
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[CONS_ERR] ${msg.text()}`);
  });

  // Navigate to login and observe API calls
  console.log('--- Navigating to /login ---');
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check what the auth page calls
  console.log('--- Looking for API URL in page context ---');
  const apiUrl = await page.evaluate(() => {
    // Check window for API URL config
    const config = window.__NEXT_DATA__ || {};
    return JSON.stringify(config, null, 2).substring(0, 500);
  }).catch(() => 'N/A');
  console.log(`Next data: ${apiUrl.substring(0, 300)}`);

  // Check localStorage for any API config
  const localStorage = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const result = {};
    for (const key of keys) {
      result[key] = localStorage.getItem(key).substring(0, 100);
    }
    return result;
  }).catch(() => ({}));
  console.log(`localStorage: ${JSON.stringify(localStorage).substring(0, 500)}`);

  // Check sessionStorage
  const sessionStorage = await page.evaluate(() => {
    const keys = Object.keys(sessionStorage);
    const result = {};
    for (const key of keys) {
      result[key] = sessionStorage.getItem(key).substring(0, 100);
    }
    return result;
  }).catch(() => ({}));
  console.log(`sessionStorage: ${JSON.stringify(sessionStorage).substring(0, 500)}`);

  await browser.close();
  console.log('Done');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
