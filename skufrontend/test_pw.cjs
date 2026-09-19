const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('PAGE_ERROR:', err.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE_ERROR:', msg.text()); });
  await page.goto('http://localhost:3000/app/signup', { waitUntil: 'networkidle' });
  await browser.close();
})();
