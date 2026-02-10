import dotenv from 'dotenv';
import { launchStealthBrowser, humanClick, randomDelay } from '../browser/stealth-utils.js';
import { createLogger } from '../core/logger.js';
import { ensureLoggedIn } from './auth.js';

dotenv.config();

const log = createLogger('CLOCK-OUT');

async function clockOut(page) {
  // Navigate to live attendance after login
  log.start('Navigating to Live Attendance...');
  await page.goto('https://hr.talenta.co/live-attendance', { waitUntil: 'domcontentloaded' });

  // Human-like pause, wait for page to fully render
  await page.waitForTimeout(randomDelay(2000, 4000));

  log.info('Waiting for Clock Out button...');
  const clockOutButton = page.getByRole('button', { name: 'Clock Out', exact: true });
  await clockOutButton.waitFor({ state: 'visible', timeout: 20000 });

  // Setup response interception
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('attendance_clocks') && resp.request().method() === 'POST',
    { timeout: 30000 }
  );

  // Human-like click
  log.info('Clicking Clock Out button...');
  await humanClick(page, clockOutButton);

  // Wait a moment for confirmation dialog
  await page.waitForTimeout(randomDelay(500, 1000));

  // Check if there's a confirmation button
  try {
    const confirmButton = page.getByRole('button', { name: 'Clock Out', exact: true });
    if (await confirmButton.isVisible({ timeout: 3000 })) {
      log.info('Confirming Clock Out...');
      await page.waitForTimeout(randomDelay(500, 1000));
      await humanClick(page, confirmButton);
    }
  } catch {
    log.debug('No confirmation dialog found, continuing...');
  }

  // Wait for API response
  log.info('Waiting for API response...');
  const response = await responsePromise;
  const data = await response.json();

  if (response.status() === 201) {
    log.success(`Clock Out berhasil! ID: ${data.data?.id}`);
    return true;
  } else {
    log.error(`Clock Out gagal: ${JSON.stringify(data)}`);
    return false;
  }
}

async function main() {
  const { browser, page } = await launchStealthBrowser();
  let success = false;

  try {
    await ensureLoggedIn(page, log);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        log.info(`Clock Out attempt ${attempt}/3`);
        success = await clockOut(page);
        if (success) break;
      } catch (error) {
        log.error(`Attempt ${attempt} error: ${error.message}`);
        if (attempt === 3) {
          await page.screenshot({ path: 'error-clock-out.png' });
          log.warn('Screenshot saved: error-clock-out.png');
        }
        // Wait before retry
        await page.waitForTimeout(2000);
      }
    }
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    await page.screenshot({ path: 'error-clock-out.png' });
  }

  setTimeout(async () => {
    await browser.close();
    process.exit(success ? 0 : 1);
  }, 3000);
}

main();
