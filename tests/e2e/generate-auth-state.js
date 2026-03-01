/**
 * Generate auth storage state for E2E tests
 *
 * This script logs in via the API and saves the browser state
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/auth/login');

  console.log('Filling login form...');
  await page.fill('#email', 'test@example.com');
  await page.fill('input#password-password', 'TestPassword123');

  console.log('Submitting login...');
  await page.click('button:has-text("Sign in")');

  // Wait for login to complete
  await page.waitForTimeout(2000);

  // Save storage state
  const storageState = await context.storageState();
  const storagePath = path.join(__dirname, '.auth', 'storage-state.json');

  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  fs.writeFileSync(storagePath, JSON.stringify(storageState, null, 2));

  console.log('Storage state saved to:', storagePath);
  console.log('Cookies:', storageState.cookies);

  await browser.close();
})();
