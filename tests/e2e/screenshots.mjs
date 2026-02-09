import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  try {
    console.log('📸 Login Page...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshots/login.png', fullPage: true });

    console.log('📸 Register Page...');
    await page.goto('http://localhost:3000/auth/register', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshots/register.png', fullPage: true });

    console.log('✅ Screenshots guardados en: screenshots/');
    console.log('👀 REVISA LAS IMÁGENES PARA VALIDAR EL UI/UX');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
