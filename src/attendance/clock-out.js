import dotenv from 'dotenv';
import { launchStealthBrowser, humanClick, randomDelay } from '../browser/stealth-utils.js';
import { createLogger } from '../core/logger.js';
import { ensureLoggedIn, logout } from './auth.js';
import { detectSchedule } from './schedule.js';

dotenv.config();

const log = createLogger('CLOCK-OUT');

async function clockOut(page) {
  // ensureLoggedIn already navigates to /live-attendance, just reload to ensure fresh state
  log.start('Reloading Live Attendance page...');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });

  // Human-like pause, wait for page to fully render
  await page.waitForTimeout(randomDelay(2000, 4000));

  // Detect schedule from dropdown — skip if no WFH/WFO found (holiday/day off)
  const schedule = await detectSchedule(page, log);

  if (!schedule.type) {
    log.info('No WFH/WFO schedule found — skipping clock out (holiday/day off).');
    return 'skipped';
  }

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

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      log.info(`Clock Out attempt ${attempt}/3`);
      await ensureLoggedIn(page, log);
      const result = await clockOut(page);

      // If skipped (no schedule), exit gracefully — job won't fail
      if (result === 'skipped') {
        await logout(page, log);
        setTimeout(async () => {
          await browser.close();
          process.exit(0);
        }, 3000);
        return;
      }

      success = result;
      if (success) break;
    } catch (error) {
      log.error(`Attempt ${attempt} error: ${error.message}`);
      if (attempt === 3) {
        try {
          await page.screenshot({ path: 'error-clock-out.png' });
          log.warn('Screenshot saved: error-clock-out.png');
        } catch { /* ignore screenshot errors */ }
      }
      // Wait before retry with increasing backoff
      const backoff = attempt * 5000;
      log.info(`Waiting ${backoff / 1000}s before retry...`);
      await page.waitForTimeout(backoff);
    }
  }

  // Logout sebelum tutup browser
  await logout(page, log);

  setTimeout(async () => {
    await browser.close();
    process.exit(success ? 0 : 1);
  }, 3000);
}

main();
