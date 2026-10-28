import { chromium } from 'playwright';
import { createLogger } from '../core/logger.js';

const log = createLogger('STEALTH');

// Random delay helper
export function randomDelay(min = 500, max = 1500) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Stealth browser launch
export async function launchStealthBrowser() {
  const isHeadless = process.env.HEADLESS === 'true';
  log.info(`Launching browser (headless: ${isHeadless})...`);

  const browser = await chromium.launch({
    headless: isHeadless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-webrtc',
      '--enforce-webrtc-ip-permission-check',
      '--window-size=1920,1080',
      '--start-maximized',
    ],
  });

  const geoLat = parseFloat(process.env.GEO_LAT || '-6.1993335');
  const geoLng = parseFloat(process.env.GEO_LNG || '106.7623687');

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    geolocation: {
      latitude: geoLat,
      longitude: geoLng,
    },
    permissions: ['geolocation'],
    colorScheme: 'light',
    hasTouch: false,
    javaScriptEnabled: true,
  });

  // Stealth patches
  await context.addInitScript(({ lat, lng }) => {
    // Override webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Fake plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Fake languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['id-ID', 'id', 'en-US', 'en'],
    });

    // Fake chrome runtime
    window.chrome = {
      runtime: {},
      loadTimes: function () { },
      csi: function () { },
      app: {},
    };

    // Override Permissions.query
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);

    // Block WebRTC IP leak
    if (window.RTCPeerConnection) {
      const OriginalRTC = window.RTCPeerConnection;
      window.RTCPeerConnection = class extends OriginalRTC {
        constructor(config) {
          if (config && config.iceServers) config.iceServers = [];
          super(config);
        }
      };
    }

    // Override navigator.geolocation
    navigator.geolocation.getCurrentPosition = function (success) {
      success({
        coords: {
          latitude: lat,
          longitude: lng,
          accuracy: 20 + Math.random() * 30,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    };
    navigator.geolocation.watchPosition = function (success) {
      navigator.geolocation.getCurrentPosition(success);
      return 1;
    };
  }, { lat: geoLat, lng: geoLng });

  await context.grantPermissions(['geolocation'], {
    origin: 'https://hr.talenta.co',
  });

  const page = await context.newPage();
  return { browser, context, page };
}


// Human-like click: hover → random pause → click with delay
export async function humanClick(page, locator) {
  // Wait for element to be visible and enabled
  await locator.waitFor({ state: 'visible', timeout: 15000 });

  // Scroll into view
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(randomDelay(300, 600));

  // Hover over the button first (mouse movement)
  await locator.hover();
  await page.waitForTimeout(randomDelay(400, 900));

  // Try normal click with mousedown delay
  try {
    await locator.click({ delay: randomDelay(80, 200) });
    log.success('Normal click executed');
    return;
  } catch (e) {
    log.warn(`Normal click failed: ${e.message}, trying fallback...`);
  }

  // Fallback 1: Force click
  try {
    await locator.click({ force: true, delay: randomDelay(80, 200) });
    log.success('Force click executed');
    return;
  } catch (e) {
    log.warn(`Force click failed: ${e.message}, trying dispatch...`);
  }

  // Fallback 2: Manual dispatch mouse events
  await locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 };
    el.dispatchEvent(new MouseEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  });
  log.success('Dispatch events executed');
}
