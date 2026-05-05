import { randomDelay } from '../browser/stealth-utils.js';

/**
 * Detect today's schedule type from the Live Attendance page.
 *
 * Layered detection (first hit wins):
 *
 *   1. CURRENT UI — BootstrapVue <select class="custom-select"> inside
 *      .schedule-time, with options like
 *        "5 May 2026 - O (09:00 AM - 06:00 PM)"
 *      The letter between " - " and " (" is the indicator (O → WFO, H → WFH).
 *
 *   2. LEGACY UI — text-only block anchored on "Schedule, <date>" header.
 *      Subsequent lines hold the type, e.g.
 *        Schedule, 05 May 2026
 *        O                              ← single letter
 *        09:00 AM - 06:00 PM
 *      or "WFO" / "WFH" full word standalone.
 *
 * Returns { type: 'WFO' | 'WFH' | null, text: string }.
 * - null → no schedule (holiday/cuti) → caller should skip clock in/out.
 *
 * Notes:
 * - BootstrapVue's `id="__BVID__N"` is auto-generated and unstable; we scope
 *   by stable structural classes (`schedule-time`, `custom-select`).
 * - Legacy fallback uses `getByText` anchor instead of scanning the whole
 *   document, per Playwright best practice.
 */
export async function detectSchedule(page, log) {
  log.info('Detecting schedule type...');

  await page.waitForTimeout(randomDelay(1000, 2000));

  // ── Strategy 1: <select> dropdown (current Talenta UI) ────────────────
  const scheduleSelect = page
    .locator('div.schedule-time select.custom-select')
    .first();

  let selectAttached = false;
  try {
    await scheduleSelect.waitFor({ state: 'attached', timeout: 3000 });
    selectAttached = true;
  } catch {
    // Select absent → fall through to legacy text scan
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

    // Select present but no O/H token → authoritative "no work today"
    log.warn('Select found but no O/H token — likely holiday/day off.');
    return { type: null, text: '' };
  }

  // ── Strategy 2: Legacy text fallback (no <select> in DOM) ─────────────
  log.info('No <select> found — falling back to text scan.');

  const scheduleLabel = page.getByText(/^Schedule,\s/i).first();
  if ((await scheduleLabel.count()) === 0) {
    log.warn('No "Schedule," label found — page may not have loaded yet.');
    return { type: null, text: '' };
  }

  const containerText = await scheduleLabel.evaluate((el) => {
    const container =
      el.closest('div, section, article, td') ?? el.parentElement;
    return (container?.innerText ?? '').trim();
  });
  log.info(`Schedule block: "${containerText.replace(/\n/g, ' | ')}"`);

  const lines = containerText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/^Schedule,/i.test(line)) continue;
    const type = parseScheduleType(line);
    if (type) {
      log.success(`Schedule detected: ${type} (via text fallback)`);
      return { type, text: type === 'WFO' ? 'O' : 'H' };
    }
  }

  log.warn('No O/H/WFO/WFH found — likely holiday/day off.');
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
