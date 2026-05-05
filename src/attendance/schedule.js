import { randomDelay } from '../browser/stealth-utils.js';

/**
 * Detect today's schedule type from the Live Attendance page.
 *
 * Talenta renders a BootstrapVue <b-form-select> inside .schedule-time, e.g.
 *   <option value="0">5 May 2026 - O (09:00 AM - 06:00 PM)</option>
 * The single letter between " - " and " (" indicates Office (O → WFO) or
 * Home (H → WFH). Today's schedule is the first/selected option.
 *
 * Returns { type: 'WFO' | 'WFH' | null, text: string }.
 * - null → no schedule (holiday/cuti) → caller should skip clock in/out.
 *
 * Note: BootstrapVue's `id="__BVID__N"` is auto-generated and unstable, so we
 * scope by stable structural classes (`schedule-time`, `custom-select`) instead.
 */
export async function detectSchedule(page, log) {
  log.info('Detecting schedule type...');

  await page.waitForTimeout(randomDelay(1000, 2000));

  const scheduleSelect = page
    .locator('div.schedule-time select.custom-select')
    .first();

  try {
    await scheduleSelect.waitFor({ state: 'attached', timeout: 5000 });
  } catch {
    log.warn('Schedule dropdown not found — likely holiday/day off.');
    return { type: null, text: '' };
  }

  const selectedText = await scheduleSelect.evaluate((sel) => {
    const opt = sel.options[sel.selectedIndex] ?? sel.options[0];
    return (opt?.text ?? '').trim();
  });

  log.info(`Schedule option: "${selectedText}"`);

  const m = selectedText.match(/\s-\s*([OH])\s*\(/i);
  if (m) {
    const letter = m[1].toUpperCase();
    const type = letter === 'O' ? 'WFO' : 'WFH';
    log.success(`Schedule detected: ${type}`);
    return { type, text: letter };
  }

  if (/WFO/i.test(selectedText)) {
    log.success('Schedule detected: WFO (legacy text)');
    return { type: 'WFO', text: 'O' };
  }
  if (/WFH/i.test(selectedText)) {
    log.success('Schedule detected: WFH (legacy text)');
    return { type: 'WFH', text: 'H' };
  }

  log.warn('No O/H token in option text — likely holiday/day off.');
  return { type: null, text: '' };
}
