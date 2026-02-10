export async function ensureLoggedIn(page, log) {
  log.start('Navigating to Talenta...');
  await page.goto('https://hr.talenta.co/live-attendance', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check if login form exists (means not logged in yet)
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const isLoginPage = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isLoginPage) {
    log.info('Already logged in, skipping login...');
    return;
  }

  log.info('Filling credentials...');
  await page.fill('input[type="email"], input[name="email"]', process.env.TALENTA_EMAIL);
  await page.locator('input[type="password"]').first().fill(process.env.TALENTA_PASSWORD);

  log.start('Signing in...');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // Wait for login form to disappear (means login succeeded)
  log.info('Waiting for login to complete...');
  await emailInput.waitFor({ state: 'hidden', timeout: 30000 });
  await page.waitForTimeout(2000);
  log.success('Login successful');
}
