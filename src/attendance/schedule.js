import { randomDelay } from '../browser/stealth-utils.js';

/**
 * Detect today's schedule type from the Live Attendance page.
 *
 * Layered detection (first hit wins):
 *
 *   1. <select> dropdown — BootstrapVue `<select class="custom-select">`
 *      inside `.schedule-time`, with options like
 *        "5 May 2026 - O (09:00 AM - 06:00 PM)"
 *      Still present on Clock Out page.
 *
 *   2. CSS class — `p.schedule-time__type` inside `div.schedule-time`.
 *      Contains the raw type letter/word (e.g. "O", "H", "WFO", "WFH").
 *      Used on Clock In page where the select is absent.
 *
 *
 * Returns { type: 'WFO' | 'WFH' | null, text: string }.
 * - null → no schedule (holiday/cuti) → caller should skip clock in/out.
 */
export async function detectSchedule(page, log) {
  log.info('Detecting schedule type...');

  await page.waitForTimeout(randomDelay(1000, 2000));

  // ── Strategy 1: <select> dropdown (present on Clock Out) ──────────────
  const scheduleSelect = page
    .locator('div.schedule-time select.custom-select')
    .first();

  let selectAttached = false;
  try {
    await scheduleSelect.waitFor({ state: 'attached', timeout: 3000 });
    selectAttached = true;
  } catch {
    // Select absent → fall through
  }

  if (selectAttached) {
    const selectedText = await scheduleSelect.evaluate((sel) => {
      const opt = sel.options[sel.selectedIndex] ?? sel.options[0];
      return (opt?.text ?? '').trim();
    });
    log.info(`Schedule option: "${selectedText}"`);

    const type = parseScheduleType(selectedText);
    if (type) {
      log.success(`Schedule detected: ${type} (via select)`);
      return { type, text: type === 'WFO' ? 'O' : 'H' };
    }

    log.warn('Select found but no O/H token — likely holiday/day off.');
    return { type: null, text: '' };
  }

  // ── Strategy 2: p.schedule-time__type (present on Clock In) ───────────
  const typeEl = page.locator('div.schedule-time p.schedule-time__type').first();

  let typeAttached = false;
  try {
    await typeEl.waitFor({ state: 'attached', timeout: 5000 });
    typeAttached = true;
  } catch {
    // Not found → fall through
  }

  if (typeAttached) {
    const rawText = (await typeEl.textContent()).trim();
    log.info(`Schedule type element: "${rawText}"`);

    const type = parseScheduleType(rawText);
    if (type) {
      log.success(`Schedule detected: ${type} (via .schedule-time__type)`);
      return { type, text: type === 'WFO' ? 'O' : 'H' };
    }

    log.warn('schedule-time__type found but no O/H token — likely holiday/day off.');
    return { type: null, text: '' };
  }

  log.warn('No select or type element found — page may have changed layout.');
  return { type: null, text: '' };
}

/**
 * Parse a single line of text for a WFO/WFH indicator.
 * Order matters: combined-line pattern is checked first because it contains
 * the time range that would otherwise need to be filtered out separately.
 */
function parseScheduleType(text) {
  if (!text) return null;

  // Combined: "<date> - O (HH:MM AM - HH:MM PM)"
  const combined = text.match(/\s-\s*([OH])\s*\(/i);
  if (combined) {
    return combined[1].toUpperCase() === 'O' ? 'WFO' : 'WFH';
  }

  // Full word with boundary (avoid matching substrings)
  if (/\bWFO\b/i.test(text)) return 'WFO';
  if (/\bWFH\b/i.test(text)) return 'WFH';

  // Single letter standalone line (legacy multi-line layout)
  if (/^O$/i.test(text)) return 'WFO';
  if (/^H$/i.test(text)) return 'WFH';

  return null;
}
