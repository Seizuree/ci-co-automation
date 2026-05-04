import { randomDelay } from '../browser/stealth-utils.js';

/**
 * Detect schedule type from the Live Attendance page.
 * Searches the entire page for "WFH" or "WFO" text.
 * Returns { type: 'WFH' | 'WFO' | null, text: string }
 *
 * - WFH/WFO detected → proceed with clock in/out
 * - null → no schedule (holiday, day off, cuti) → skip
 */
export async function detectSchedule(page, log) {
  log.info('Detecting schedule (looking for WFH/WFO on page)...');

  // Wait for page to stabilize
  await page.waitForTimeout(randomDelay(1000, 2000));

  // Get all visible text content from the page body
  const pageText = await page.evaluate(() => {
    return document.body.innerText || '';
  });

  // Check for WFH
  if (/WFH/i.test(pageText)) {
    log.success('Schedule detected: WFH (Work From Home)');
    return { type: 'WFH', text: 'WFH' };
  }

  // Check for WFO
  if (/WFO/i.test(pageText)) {
    log.success('Schedule detected: WFO (Work From Office)');
    return { type: 'WFO', text: 'WFO' };
  }

  // No WFH/WFO found — holiday, day off, etc.
  log.warn('No WFH/WFO text found on page — likely holiday/day off');
  return { type: null, text: '' };
}
