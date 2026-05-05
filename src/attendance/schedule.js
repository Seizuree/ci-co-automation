import { randomDelay } from '../browser/stealth-utils.js';

/**
 * Detect schedule type from the Live Attendance page.
 *
 * The page layout shows:
 *   "Schedule, DD MMM YYYY"
 *   "<type>"              ← "O" (Office/WFO), "H" (Home/WFH), or other
 *   "HH:MM AM - HH:MM PM"
 *
 * Detection strategy:
 * 1. Look for the schedule section text below the date line
 * 2. Check for "O" or "H" as the schedule type indicator
 * 3. Also still supports full "WFO"/"WFH" text as fallback
 *
 * Returns { type: 'WFO' | 'WFH' | null, text: string }
 *
 * - WFO/WFH detected → proceed with clock in/out
 * - null → no schedule (holiday, day off, cuti) → skip
 */
export async function detectSchedule(page, log) {
  log.info('Detecting schedule type...');

  // Wait for page to stabilize
  await page.waitForTimeout(randomDelay(1000, 2000));

  // Try to find the schedule type text that appears between the "Schedule, <date>" line
  // and the time range (e.g. "09:00 AM - 06:00 PM")
  const scheduleType = await page.evaluate(() => {
    // Strategy: find the element containing "Schedule," text, then look within
    // its parent container for the schedule type (O/H/WFO/WFH)
    const allElements = document.querySelectorAll('*');
    let scheduleContainer = null;

    // Find the element that directly contains "Schedule," text
    for (const el of allElements) {
      // Check direct text content (not children) to find the exact element
      if (el.children.length < 10 && /^Schedule,\s/i.test(el.textContent?.trim())) {
        scheduleContainer = el.closest('div, section, article, td') || el.parentElement;
        break;
      }
    }

    if (!scheduleContainer) return null;

    // Get text content of the container and split into lines
    const containerText = scheduleContainer.innerText || '';
    const lines = containerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Find the "Schedule," line within this container
    const scheduleIdx = lines.findIndex(l => /^Schedule,/i.test(l));
    if (scheduleIdx === -1) return null;

    // Look at lines between "Schedule, <date>" and the time range
    for (let i = scheduleIdx + 1; i < Math.min(scheduleIdx + 4, lines.length); i++) {
      const line = lines[i];

      // Skip if it's the time range line (e.g. "09:00 AM - 06:00 PM")
      if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(line)) continue;

      // Check for full WFH/WFO text
      if (/WFO/i.test(line)) return 'WFO';
      if (/WFH/i.test(line)) return 'WFH';

      // Check for single letter "O" (Office) or "H" (Home)
      if (/^O$/i.test(line)) return 'WFO';
      if (/^H$/i.test(line)) return 'WFH';
    }

    return null;
  });

  if (scheduleType === 'WFO') {
    log.success('Schedule detected: WFO (Work From Office)');
    return { type: 'WFO', text: 'O' };
  }

  if (scheduleType === 'WFH') {
    log.success('Schedule detected: WFH (Work From Home)');
    return { type: 'WFH', text: 'H' };
  }

  // No schedule type found
  log.warn('No O/H schedule type found — likely holiday/day off');
  return { type: null, text: '' };
}
