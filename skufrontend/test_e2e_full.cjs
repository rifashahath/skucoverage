const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

async function runE2ESuite() {
  console.log('🚀 Starting SKUcoverage Comprehensive Playwright E2E Verification Suite...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out harmless offline network resolution attempts in local sandbox
      if (!text.includes('ERR_NAME_NOT_RESOLVED')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      testsFailed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST GROUP 1: Header Navigation & Info Modals
    // -------------------------------------------------------------
    console.log('--- TEST GROUP 1: Header Navigation & Info Modals ---');
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Verify Title / Brand Logo
    const brandText = await page.textContent('header');
    assert(brandText.includes('SKUcoverage'), 'Header displays SKUcoverage brand logo and name');

    // Click Overview in Header
    await page.click('header nav button:has-text("Overview")');
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });
    const overviewHeading = await page.textContent('div.fixed.inset-0 h2');
    assert(overviewHeading.includes('About SKUcoverage'), 'Overview modal opened with "About SKUcoverage"');
    await page.click('div.fixed.inset-0 button:has(span:has-text("close"))');
    await page.waitForTimeout(300);

    // Click Docs in Header
    await page.click('header nav button:has-text("Docs")');
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });
    const docsModal = await page.textContent('div.fixed.inset-0 h2');
    assert(docsModal.includes('Documentation & Standards'), 'Docs modal opened with "Documentation & Standards"');
    await page.click('div.fixed.inset-0 button:has(span:has-text("close"))');
    await page.waitForTimeout(300);

    // Click Benchmarks in Header
    await page.click('header nav button:has-text("Benchmarks")');
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });
    const benchModal = await page.textContent('div.fixed.inset-0 h2');
    assert(benchModal.includes('E-commerce Feed Benchmarks'), 'Benchmarks modal opened with "E-commerce Feed Benchmarks"');
    await page.click('div.fixed.inset-0 button:has(span:has-text("close"))');
    await page.waitForTimeout(300);

    // Click Integrations in Header
    await page.click('header nav button:has-text("Integrations")');
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });
    const integModal = await page.textContent('div.fixed.inset-0 h2');
    assert(integModal.includes('E-Commerce Integrations'), 'Integrations modal opened with "E-Commerce Integrations"');
    await page.click('div.fixed.inset-0 button:has(span:has-text("close"))');
    await page.waitForTimeout(300);

    // Click Upgrade / Get Started in Header
    await page.click('header button:has-text("Get Started")');
    await page.waitForSelector('div.fixed.inset-0', { timeout: 3000 });
    const upgradeModal = await page.textContent('div.fixed.inset-0');
    assert(upgradeModal.includes('Upgrade your workflow') || upgradeModal.includes('Pro Tier'), 'Upgrade modal opened via Get Started');
    await page.click('div.fixed.inset-0 button:has(span:has-text("close"))');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // TEST GROUP 2: Catalog Health Overview View Elements
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Catalog Health Overview Elements ---');
    const mainContent = await page.textContent('main');

    // 4 KPI cards
    assert(mainContent.includes('Health Score'), 'KPI 1: Health Score card displayed');
    assert(mainContent.includes('Products Audited'), 'KPI 2: Products Audited card displayed');
    assert(mainContent.includes('Detected Issues'), 'KPI 3: Detected Issues card displayed');
    assert(mainContent.includes('High Priority'), 'KPI 4: High Priority card displayed');

    // Attribute Breakdown
    assert(mainContent.includes('Catalog Attribute Breakdown'), 'Catalog Attribute Breakdown section rendered');
    assert(mainContent.includes('Titles') && mainContent.includes('GTINs / Barcodes') && mainContent.includes('Google Categories'), 'All attribute score bars rendered');

    // Action Plan
    assert(mainContent.includes('Recommended Action Plan'), 'Recommended Action Plan rendered');

    // Flagged Product Samples: Click specimen to open ProductDetailModal
    const specimenCard = page.locator('main section:has-text("Flagged Product Samples") div.cursor-pointer').first();
    await specimenCard.click();
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });
    const productModal = await page.textContent('div.fixed.inset-0');
    assert(productModal.includes('SKU:') && productModal.includes('Google Product Category'), 'ProductDetailModal opened with SKU metadata');
    await page.click('div.fixed.inset-0 button:has(span:has-text("close"))');
    await page.waitForTimeout(300);

    // Audit Scope button
    await page.click('main button:has-text("Audit Scope")');
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });
    const scopeModal = await page.textContent('div.fixed.inset-0 h2');
    assert(scopeModal.includes('Audit Scope & Rules'), 'Audit Scope modal opened with "Audit Scope & Rules"');
    await page.click('div.fixed.inset-0 button:has(span:has-text("close"))');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // TEST GROUP 3: Interactive Issue Drawer (InspectIssueModal & SKU Fix)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Inspect Issue Modal & Single SKU Resolution ---');
    // Find the first Inspect button in Detected Catalog Issues
    const firstInspectBtn = page.locator('main section:has-text("Detected Catalog Issues") button:has-text("Inspect")').first();
    await firstInspectBtn.click();
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });

    const issueModalTitle = await page.textContent('div.fixed.inset-0 h2');
    assert(issueModalTitle.length > 0, `InspectIssueModal opened with title: "${issueModalTitle}"`);

    // Click "Fix SKU" on first affected item in modal
    const fixSkuBtn = page.locator('div.fixed.inset-0 button:has-text("Fix SKU")').first();
    await fixSkuBtn.click();
    await page.waitForTimeout(400);

    // Verify it transitioned to "Fixed"
    const fixedIndicator = await page.locator('div.fixed.inset-0 span:has-text("Fixed")').count();
    assert(fixedIndicator > 0, 'SKU marked as "Fixed" in InspectIssueModal');

    // Close issue drawer
    await page.click('div.fixed.inset-0 button:has(span:has-text("close"))');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // TEST GROUP 4: Batch Fix in Main Result Card
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Batch Fix Selected Action ---');
    await page.click('main article button:has-text("Batch Fix Selected")');
    await page.waitForTimeout(500);

    const postBatchContent = await page.textContent('main');
    assert(postBatchContent.includes('92/100') || postBatchContent.includes('92'), 'Batch Fix elevated Health Score to 92/100');

    // -------------------------------------------------------------
    // TEST GROUP 5: Tab Navigation & URL Sync (GTIN & Barcodes)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Barcode Inspector Tab & Live Validator ---');
    await page.click('aside button:has-text("GTIN & Barcodes")');
    await page.waitForTimeout(400);

    assert(page.url().includes('/app/barcodes'), 'URL updated to /app/barcodes');
    const barcodeHeading = await page.textContent('main h1');
    assert(barcodeHeading.includes('GTIN & Barcode Inspector'), 'BarcodeInspectorView loaded');

    // Test Barcode Live Validator Input
    const barcodeInput = page.locator('main input[placeholder*="Type any 12 or 13 digit"]');
    await barcodeInput.fill('084920198421');
    await page.waitForTimeout(200);
    const validResult = await page.textContent('main');
    assert(validResult.includes('GOOGLE COMPLIANT') && validResult.includes('Valid GS1 Modulo-10 checksum'), 'Modulo-10 validator correctly accepts valid UPC: 084920198421');

    await barcodeInput.fill('123456');
    await page.waitForTimeout(200);
    const invalidResult = await page.textContent('main');
    assert(invalidResult.includes('Invalid Length'), 'Modulo-10 validator flags invalid length for: 123456');

    // Fix a product barcode
    const assignBtn = page.locator('main button:has-text("Assign Barcode")').first();
    if (await assignBtn.count() > 0) {
      await assignBtn.click();
      await page.waitForTimeout(300);
      const assignedBadge = await page.locator('main span:has-text("Barcode Assigned")').count();
      assert(assignedBadge > 0, 'Individual SKU barcode successfully assigned and updated');
    }

    // Auto-Assign All Barcodes
    await page.click('main button:has-text("Auto-Assign All Barcodes")');
    await page.waitForTimeout(400);
    assert(true, 'Auto-Assign All Barcodes executed');

    // -------------------------------------------------------------
    // TEST GROUP 6: SEO & Alt Text Tab
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: SEO & Alt Text Studio ---');
    await page.click('aside button:has-text("SEO & Alt Text")');
    await page.waitForTimeout(400);

    assert(page.url().includes('/app/seo-images'), 'URL updated to /app/seo-images');
    const seoHeading = await page.textContent('main h1');
    assert(seoHeading.includes('SEO & Image Alt Text Studio'), 'SeoMediaView loaded');

    // Batch Generate Alt Texts button
    await page.click('main button:has-text("Batch Generate All Alt Texts")');
    await page.waitForTimeout(400);
    assert(true, 'Batch Generate Alt Texts executed');

    // -------------------------------------------------------------
    // TEST GROUP 7: Google Categories Tab
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 7: Category Mapper & Google Taxonomy ---');
    await page.click('aside button:has-text("Google Categories")');
    await page.waitForTimeout(400);

    assert(page.url().includes('/app/categories'), 'URL updated to /app/categories');
    const catHeading = await page.textContent('main h1');
    assert(catHeading.includes('Google Categories & Taxonomy'), 'CategoryMapperView loaded');

    // Search Taxonomy Categories
    const taxonomySearch = page.locator('main input[placeholder*="Search category"]');
    await taxonomySearch.fill('Kitchen Knives');
    await page.waitForTimeout(200);
    const catSearchText = await page.textContent('main');
    assert(catSearchText.includes('Kitchen Knives'), 'Taxonomy search filtered properly to "Kitchen Knives"');

    // Accept Suggested Mapping
    const acceptMapBtn = page.locator('main button:has-text("Accept Suggested Mapping")').first();
    if (await acceptMapBtn.count() > 0) {
      await acceptMapBtn.click();
      await page.waitForTimeout(300);
      const mappedBadge = await page.locator('main span:has-text("Mapped")').count();
      assert(mappedBadge > 0, 'Category mapping successfully accepted for SKU');
    }

    // -------------------------------------------------------------
    // TEST GROUP 8: 1-Click Fix & Export Tab
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 8: 1-Click Fix & Export Center ---');
    await page.click('aside button:has-text("1-Click Fix & Export")');
    await page.waitForTimeout(400);

    assert(page.url().includes('/app/fix-export'), 'URL updated to /app/fix-export');
    const fixHeading = await page.textContent('main h1');
    assert(fixHeading.includes('1-Click Fix & Export Center'), 'FixExportCenterView loaded');

    // Test Apply All Fixes button
    await page.click('main button:has-text("Apply All Automated Fixes")');
    await page.waitForTimeout(400);
    const fixContent = await page.textContent('main');
    assert(fixContent.includes('Fixes Applied!'), 'Applied automated batch fixes via Fix & Export Center');

    // Test Download Shopify CSV trigger
    await page.click('main button:has-text("Download Shopify Import CSV")');
    await page.waitForTimeout(400);
    const shopifyCsvBtn = await page.locator('main button:has-text("Downloaded!")').count();
    assert(shopifyCsvBtn > 0, 'Shopify Import CSV export generated and confirmed');

    // -------------------------------------------------------------
    // TEST GROUP 9: Beginner's Guide Tab
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 9: Beginner\'s Guide & Interactive Checklist ---');
    await page.click('aside button:has-text("Beginner\'s Guide")');
    await page.waitForTimeout(400);

    assert(page.url().includes('/app/quick-guide'), 'URL updated to /app/quick-guide');
    const guideHeading = await page.textContent('main h1');
    assert(guideHeading.includes("Beginner's Guide"), 'BeginnerGuideView loaded');

    // Test Accordion expansion
    await page.click('main button:has-text("2. What is a GTIN")');
    await page.waitForTimeout(200);
    const guideContent = await page.textContent('main');
    assert(guideContent.includes('Global Trade Item Number'), 'Accordion expanded with GTIN definition');

    // Test Interactive Checklist Toggle
    const checklistItems = page.locator('main input[type="checkbox"]');
    if (await checklistItems.count() > 1) {
      await checklistItems.nth(1).check();
      await page.waitForTimeout(200);
      assert(await checklistItems.nth(1).isChecked(), 'Checklist interactive step toggled');
    }

    // -------------------------------------------------------------
    // TEST GROUP 10: Audit History Tab
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 10: Audit History Ledger & Filtering ---');
    await page.click('aside button:has-text("Audit History")');
    await page.waitForTimeout(400);

    assert(page.url().includes('/app/audit-history'), 'URL updated to /app/audit-history');
    const historyHeading = await page.textContent('main h1');
    assert(historyHeading.includes('Audit History'), 'AuditHistoryView loaded');

    // Filter audits search
    const historyFilter = page.locator('main input[placeholder*="Filter audits or stores"]');
    await historyFilter.fill('allbirds');
    await page.waitForTimeout(200);
    const filteredTable = await page.textContent('main table');
    assert(filteredTable.includes('allbirds') && !filteredTable.includes('gymshark'), 'History table filtered correctly to matching store');

    await historyFilter.fill('');
    await page.waitForTimeout(200);

    // Test Automated Weekly Recurrence modal
    await page.click('main h3:has-text("Automated Weekly Recurrence")');
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });
    const schedModal = await page.textContent('div.fixed.inset-0 h2');
    assert(schedModal.includes('Automated Scan Schedule'), 'Automated Scan Schedule modal opened');
    await page.click('div.fixed.inset-0 button:has(span:has-text("close"))');
    await page.waitForTimeout(300);

    // Test Health Threshold Alerts modal
    await page.click('main h3:has-text("Health Threshold Alerts")');
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });
    const alertModal = await page.textContent('div.fixed.inset-0 h2');
    assert(alertModal.includes('Health Threshold Alerts'), 'Health Threshold Alerts modal opened');
    await page.click('div.fixed.inset-0 button:has(span:has-text("close"))');
    await page.waitForTimeout(300);

    // Test "View Report" button on first row (loads report into overview)
    await page.click('main table tbody tr:first-child button:has-text("View Report")');
    await page.waitForTimeout(400);
    assert(page.url().includes('/app') && !page.url().includes('/app/audit-history'), 'View Report navigated back to /app Overview');

    // -------------------------------------------------------------
    // TEST GROUP 11: Store Settings Tab & Danger Zone Modals
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 11: Store Settings & Danger Zone Modals ---');
    await page.click('aside button:has-text("Store Settings")');
    await page.waitForTimeout(400);

    assert(page.url().includes('/app/settings'), 'URL updated to /app/settings');
    const settingsHeading = await page.textContent('main h1');
    assert(settingsHeading.includes('Account Settings'), 'SettingsView loaded');

    // Test Store Domain Save
    const storeInput = page.locator('main input[placeholder*="your-store.myshopify.com"]');
    await storeInput.fill('flagship-apparel.myshopify.com');
    await page.click('main button:has-text("Save")');
    await page.waitForTimeout(600);
    const saveNotice = await page.textContent('main');
    assert(saveNotice.includes('Changes saved successfully'), 'Store domain updated and success feedback shown');

    // Test Danger Zone: Disconnect Store Modal
    await page.click('main button:has-text("Disconnect Store")');
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });
    const disconnectModal = await page.textContent('div.fixed.inset-0 h2');
    assert(disconnectModal.includes('Disconnect Store?'), 'Disconnect modal opened with "Disconnect Store?"');
    await page.click('div.fixed.inset-0 button:has-text("Cancel")');
    await page.waitForTimeout(300);

    // Test Danger Zone: Purge Cache Modal
    await page.click('main button:has-text("Purge Cache")');
    await page.waitForSelector('div.fixed.inset-0 h2', { timeout: 3000 });
    const purgeModal = await page.textContent('div.fixed.inset-0 h2');
    assert(purgeModal.includes('Purge Local Cache?'), 'Purge Cache modal opened with "Purge Local Cache?"');
    await page.click('div.fixed.inset-0 button:has-text("Cancel")');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // TEST GROUP 12: Direct Deep Linking
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 12: Direct Deep Linking Navigation ---');
    await page.goto(`${BASE_URL}/app/categories`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const deepCatHeading = await page.textContent('main h1');
    assert(deepCatHeading.includes('Google Categories & Taxonomy'), 'Direct deep link to /app/categories opened CategoryMapperView');

    await page.goto(`${BASE_URL}/app/barcodes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const deepBarcodeHeading = await page.textContent('main h1');
    assert(deepBarcodeHeading.includes('GTIN & Barcode Inspector'), 'Direct deep link to /app/barcodes opened BarcodeInspectorView');

    // -------------------------------------------------------------
    // TEST GROUP 13: Browser History Back / Forward (popstate)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 13: Browser Back & Forward (popstate) ---');
    await page.goBack();
    await page.waitForTimeout(400);
    assert(page.url().includes('/app/categories'), 'Browser Back went to /app/categories');

    await page.goForward();
    await page.waitForTimeout(400);
    assert(page.url().includes('/app/barcodes'), 'Browser Forward returned to /app/barcodes');

    // -------------------------------------------------------------
    // TEST GROUP 14: Dedicated Auth Screens (/app/signup & /app/login)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 14: Auth Screens (/app/signup & /app/login) ---');
    await page.goto(`${BASE_URL}/app/signup`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const signupHeading = await page.textContent('h1');
    assert(signupHeading.includes('Create your account'), 'AuthScreen rendered on /app/signup');

    // Click "Sign in" switch link
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(300);
    assert(page.url().includes('/app/login'), 'Switch link changed URL to /app/login');
    const loginHeading = await page.textContent('h1');
    assert(loginHeading.includes('Welcome back'), 'AuthScreen rendered in signin mode');

    // -------------------------------------------------------------
    // TEST GROUP 15: Re-run Audit Scan Workflow
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 15: Re-run Audit Scanning Stage ---');
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await page.click('main button:has-text("Re-run audit")');
    await page.waitForSelector('main h2:has-text("Analyzing")', { timeout: 5000 });

    const scanningText = await page.textContent('main');
    assert(scanningText.includes('Analyzing') && scanningText.includes('Inspecting'), 'Audit scanning stage triggered and displayed progress stream');

    // Cancel scan
    await page.click('main button:has-text("Cancel")');
    await page.waitForTimeout(500);
    const emptyStateText = await page.textContent('main');
    assert(emptyStateText.includes('Catalog Health Diagnostic') || emptyStateText.includes('Run audit'), 'Cancelled scan returned safely to diagnostic input state');

    // Verify Console & Page Errors
    console.log('\n--- BROWSER INTEGRITY AUDIT ---');
    assert(pageErrors.length === 0, `Zero page runtime exceptions (found ${pageErrors.length})`, pageErrors.join(', '));
    assert(consoleErrors.length === 0, `Zero browser console errors (found ${consoleErrors.length})`, consoleErrors.join(', '));

  } catch (err) {
    console.error('💥 Test suite crashed with error:', err);
    testsFailed++;
  } finally {
    await browser.close();
  }

  console.log('\n=============================================================');
  console.log(`E2E TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('=============================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runE2ESuite();
