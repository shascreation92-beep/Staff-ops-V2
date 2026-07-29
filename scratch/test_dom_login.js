const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function testDomLogin() {
  console.log('=== STARTING DOM AGENT LOGIN TEST ===');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const screenshotPath = 'C:\\Users\\ecom\\.gemini\\antigravity-ide\\brain\\a5545525-42e4-4ef6-9246-0b4fe11b909e\\dom_login_test.png';

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[BROWSER PAGE ERROR]', err.message));
  page.on('response', res => {
    if (res.status() >= 400) console.log('[BROWSER HTTP ERROR]', res.status(), res.url());
  });

  console.log('1. Navigating DOM to https://environments-richard-planner-miscellaneous.trycloudflare.com/auth/signin ...');
  await page.goto('https://environments-richard-planner-miscellaneous.trycloudflare.com/auth/signin', { waitUntil: 'networkidle2' });

  const initialUrl = page.url();
  const initialTitle = await page.title();
  console.log(`- Page Loaded: "${initialTitle}" at ${initialUrl}`);

  // Inspect DOM inputs
  const emailInput = await page.$('input[type="text"], input[type="email"], input[name="email"]');
  const passwordInput = await page.$('input[type="password"], input[name="password"]');
  const submitBtn = await page.$('button[type="submit"], button');

  console.log(`2. Inspecting DOM elements:
- Email Input Found: ${!!emailInput}
- Password Input Found: ${!!passwordInput}
- Submit Button Found: ${!!submitBtn}`);

  if (emailInput && passwordInput && submitBtn) {
    console.log('3. Interacting with DOM: Typing credentials and clicking submit...');
    
    // Clear and type email
    await emailInput.focus();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await emailInput.type('faizancheena9@gmail.com', { delay: 30 });

    // Clear and type password
    await passwordInput.focus();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await passwordInput.type('Cupoftea@9090', { delay: 30 });

    // Click submit button
    await submitBtn.click();
    console.log('3b. Clicked submit button, waiting for authentication & redirect...');

    // Wait for client-side navigation or URL change
    await page.waitForFunction(
      () => window.location.pathname === '/' || window.location.pathname === '',
      { timeout: 10000 }
    ).catch(e => console.log('Wait for redirect note:', e.message));

    await page.evaluate(() => new Promise(r => setTimeout(r, 1000)));

    console.log('4. Navigating DOM to /accounts (User Data) ...');
    await page.goto('https://environments-richard-planner-miscellaneous.trycloudflare.com/accounts', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout ? page.waitForTimeout(1500) : new Promise(r => setTimeout(r, 1500));

    const finalUrl = page.url();
    const finalTitle = await page.title();

    console.log(`5. Accounts Page (User Data) DOM Post-Click Verification:
- Final URL: ${finalUrl}
- Page Title: "${finalTitle}"`);

    // Capture screenshot artifact
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`- Screenshot saved to: ${screenshotPath}`);

    // Check session cookies
    const cookies = await page.cookies();
    const sessionCookie = cookies.find(c => c.name.includes('next-auth') || c.name.includes('session'));
    console.log(`- Session Cookie Detected: ${!!sessionCookie} (${sessionCookie ? sessionCookie.name : 'None'})`);
  } else {
    console.error('DOM elements missing for login execution!');
  }

  await browser.close();
  console.log('=== DOM AGENT LOGIN TEST COMPLETE ===');
}

testDomLogin().catch(err => {
  console.error('DOM Test Error:', err);
  process.exit(1);
});
