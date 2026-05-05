import { appendFileSync } from 'fs';
import dotenv from 'dotenv';
import { launchStealthBrowser } from '../browser/stealth-utils.js';
import { createLogger } from '../core/logger.js';
import { ensureLoggedIn, logout } from './auth.js';
import { detectSchedule } from './schedule.js';

dotenv.config();

const log = createLogger('VALIDATE');

/**
 * Append a single-line key=value entry to $GITHUB_OUTPUT for the workflow
 * to consume. No-op when not running under GitHub Actions.
 */
function ghOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const safe = String(value).replace(/[\r\n]+/g, ' ');
  appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${safe}\n`);
}

/**
 * Read-only smoke test: log in, navigate to /live-attendance, run schedule
 * detection, verify button presence, log out. Does NOT click Clock In/Out.
 *
 * Exit codes:
 *   0 = all steps OK
 *   1 = any step threw
 *
 * Per-step outcomes are streamed to $GITHUB_OUTPUT as they complete, so the
 * workflow can surface them in Telegram even on partial failure.
 */
async function validate() {
  const { browser, page } = await launchStealthBrowser();
  let exitCode = 1;

  try {
    log.info('Step 1/5: Login...');
    await ensureLoggedIn(page, log);
    ghOutput('login_ok', 'true');

    log.info('Step 2/5: Verify on /live-attendance...');
    if (!page.url().includes('/live-attendance')) {
      throw new Error(`Expected /live-attendance, got ${page.url()}`);
    }
    ghOutput('url_ok', 'true');

    log.info('Step 3/5: Detect schedule (read-only)...');
    const schedule = await detectSchedule(page, log);
    ghOutput('schedule_type', schedule.type ?? 'null');
    ghOutput('schedule_text', schedule.text ?? '');

    log.info('Step 4/5: Check Clock In/Out button presence...');
    const clockInVisible =
      (await page
        .getByRole('button', { name: 'Clock In', exact: true })
        .count()) > 0;
    const clockOutVisible =
      (await page
        .getByRole('button', { name: 'Clock Out', exact: true })
        .count()) > 0;
    ghOutput('clock_in_visible', String(clockInVisible));
    ghOutput('clock_out_visible', String(clockOutVisible));
    log.info(`Clock In: ${clockInVisible}, Clock Out: ${clockOutVisible}`);

    log.info('Step 5/5: Logout...');
    await logout(page, log);
    ghOutput('logout_ok', 'true');

    log.success('Validation passed.');
    exitCode = 0;
  } catch (error) {
    ghOutput('error', error.message);
    log.error(`Validation failed: ${error.message}`);
    try {
      await page.screenshot({ path: 'error-validate.png' });
      log.warn('Screenshot saved: error-validate.png');
    } catch {
      /* ignore screenshot errors */
    }
  }

  setTimeout(async () => {
    await browser.close();
    process.exit(exitCode);
  }, 2000);
}

validate();
