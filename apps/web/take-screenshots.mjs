const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login Page
    console.log('📸 Login Page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/login.png', fullPage: true });

    // Register Page
    console.log('📸 Register Page...');
    await page.goto('http://localhost:3000/auth/register');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/register.png', fullPage: true });

    console.log('✅ Screenshots guardados en: screenshots/');
    console.log('👀 Revisa las imágenes para validar el UI/UX');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
