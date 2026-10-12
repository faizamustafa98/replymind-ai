const { chromium } = require('playwright');
const FRONTEND = 'https://replymindai.netlify.app';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Monitor all API/fetch calls
  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (!url.includes('fontshare') && !url.includes('googleapis') && !url.startsWith('data:')) {
      apiCalls.push({ type: 'REQ', method: req.method(), url, headers: req.headers() });
    }
  });

  page.on('response', async resp => {
    const url = resp.url();
    if (!url.includes('fontshare') && !url.includes('googleapis') && !url.startsWith('data:')) {
      let body = '';
      try { body = await resp.text().catch(() => ''); } catch(e) {}
      apiCalls.push({ type: 'RES', status: resp.status(), url, body: body.substring(0, 200) });
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') apiCalls.push({ type: 'CONS_ERR', text: msg.text() });
  });

  // Sign up
  const email = `monitor.${Date.now()}@replymind.test`;
  const pw = 'TestPass123!';

  console.log('--- Signing up ---');
  await page.goto(`${FRONTEND}/register`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  
  const inputs = page.locator('input');
  await inputs.nth(0).fill('Monitor Tester');
  await inputs.nth(1).fill(email);
  await inputs.nth(2).fill(pw);
  await inputs.nth(3).fill(pw);
  await page.waitForTimeout(300);
  await Promise.all([
    page.waitForNavigation({ timeout: 20000 }).catch(() => null),
    page.locator('button:has-text("Sign Up")').click(),
  ]);
  await page.waitForTimeout(3000);
  console.log(`URL after signup: ${page.url()}`);

  // Log API calls made during signup
  console.log('\n--- API Calls during signup ---');
  for (const call of apiCalls) {
    if (call.type === 'REQ') console.log(`REQUEST: ${call.method} ${call.url}`);
    else if (call.type === 'RES') console.log(`RESPONSE: ${call.status} ${call.url.substring(0, 100)} | ${call.body.substring(0, 100)}`);
    else if (call.type === 'CONS_ERR') console.log(`CONSOLE ERROR: ${call.text}`);
  }

  // Now log in fresh with the same credentials
  console.log('\n--- Logging in fresh ---');
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  const apiCalls2 = [];
  page.on('request', req => {
    const url = req.url();
    if (!url.includes('fontshare') && !url.includes('googleapis') && !url.startsWith('data:')) {
      apiCalls2.push({ type: 'REQ', method: req.method(), url });
    }
  });
  page.on('response', async resp => {
    const url = resp.url();
    if (!url.includes('fontshare') && !url.includes('googleapis') && !url.startsWith('data:')) {
      let body = '';
      try { body = await resp.text(); } catch(e) {}
      apiCalls2.push({ type: 'RES', status: resp.status(), url, body: body.substring(0, 200) });
    }
  });

  const inputs2 = page.locator('input');
  await inputs2.nth(0).fill(email);
  await inputs2.nth(1).fill(pw);
  await page.waitForTimeout(300);
  await Promise.all([
    page.waitForNavigation({ timeout: 20000 }).catch(() => null),
    page.locator('button:has-text("Sign In")').click(),
  ]);
  await page.waitForTimeout(3000);
  console.log(`URL after login: ${page.url()}`);

  console.log('\n--- API Calls during login ---');
  for (const call of apiCalls2) {
    if (call.type === 'REQ') console.log(`REQUEST: ${call.method} ${call.url}`);
    else if (call.type === 'RES') console.log(`RESPONSE: ${call.status} ${call.url.substring(0, 100)} | ${call.body.substring(0, 150)}`);
    else if (call.type === 'CONS_ERR') console.log(`CONSOLE ERROR: ${call.text}`);
  }

  await browser.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
