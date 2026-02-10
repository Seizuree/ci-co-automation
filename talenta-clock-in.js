import dotenv from 'dotenv';
import { launchStealthBrowser, humanClick, randomDelay } from './stealth-utils.js';

dotenv.config();

const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

async function ensureLoggedIn(page) {
  log('Navigating to Talenta...');
  await page.goto('https://hr.talenta.co/live-attendance', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check if login form exists (means not logged in yet)
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const isLoginPage = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isLoginPage) {
    log('Already logged in, skipping login...');
    return;
  }

  log('Filling credentials...');
  await page.fill('input[type="email"], input[name="email"]', process.env.TALENTA_EMAIL);
  await page.locator('input[type="password"]').first().fill(process.env.TALENTA_PASSWORD);

  log('Signing in...');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // Wait for login form to disappear (means login succeeded)
  log('Waiting for login to complete...');
  await emailInput.waitFor({ state: 'hidden', timeout: 30000 });
  await page.waitForTimeout(2000);
  log('Login successful');
}

async function clockIn(page) {
  // Navigate to live attendance after login
  log('Navigating to Live Attendance...');
  await page.goto('https://hr.talenta.co/live-attendance', { waitUntil: 'domcontentloaded' });

  // Human-like pause, wait for page to fully render
  await page.waitForTimeout(randomDelay(2000, 4000));

  log('Waiting for Clock In button...');
  const clockInButton = page.getByRole('button', { name: 'Clock In', exact: true });
  await clockInButton.waitFor({ state: 'visible', timeout: 20000 });

  // Setup response interception
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('attendance_clocks') && resp.request().method() === 'POST',
    { timeout: 30000 }
  );

  // Human-like click
  log('Clicking Clock In button...');
  await humanClick(page, clockInButton, log);

  // Wait for API response
  log('Waiting for API response...');
  const response = await responsePromise;
  const data = await response.json();

  if (response.status() === 201) {
    log(`✅ Clock In berhasil! ID: ${data.data?.id}`);
    return true;
  } else {
    log(`❌ Clock In gagal: ${JSON.stringify(data)}`);
    return false;
  }
}

async function main() {
  const { browser, page } = await launchStealthBrowser();
  let success = false;

  try {
    await ensureLoggedIn(page);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        log(`Clock In attempt ${attempt}/3`);
        success = await clockIn(page);
        if (success) break;
      } catch (error) {
        log(`Attempt ${attempt} error: ${error.message}`);
        if (attempt === 3) {
          await page.screenshot({ path: 'error-clock-in.png' });
          log('Screenshot saved: error-clock-in.png');
        }
        // Wait before retry
        await page.waitForTimeout(2000);
      }
    }
  } catch (error) {
    log(`Fatal error: ${error.message}`);
    await page.screenshot({ path: 'error-clock-in.png' });
  }

  // await browser.close();
  // process.exit(success ? 0 : 1);
}

main();
