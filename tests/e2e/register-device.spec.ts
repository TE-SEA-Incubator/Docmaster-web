import { test, expect } from '@playwright/test';

// Configurable frontend URL via env; default assumes a local static server
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3003/Mesappareils.html';

test.describe('Device registration', () => {
  test('submits device form and sends expected payload', async ({ page }) => {
    // Intercept the outgoing POST to any URL that contains '/devices'
    const deviceRequestPromise = page.waitForRequest((req) => {
      return req.method() === 'POST' && req.url().includes('/devices');
    });

    await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });

    // Fill the device modal fields expected by the page
    // Open the add modal if necessary
    // There are two ways sites open the modal; try direct call first
    try {
      await page.evaluate(() => { if (window.openAddModal) (window as any).openAddModal(); });
    } catch (e) {
      // ignore
    }

    // Wait a short moment for modal to appear / scripts to initialize
    await page.waitForTimeout(300);

    // Ensure fields exist and fill them
    await page.fill('#fNom', 'Test Device');
    // brand is a select; select first available option (non-empty)
    const marqueExists = await page.$('#fMarque');
    if (marqueExists) {
      await page.selectOption('#fMarque', { index: 1 }).catch(() => {});
    }
    await page.fill('#fModele', 'Model X');
    await page.fill('#fSerial', 'TEST-123456');
    await page.fill('#fCouleur', 'Noir');
    await page.fill('#fPrix', '12345');
    // Date fields: if flatpickr is used, fill underlying input with ISO date
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#fDateAchat', today).catch(() => {});
    await page.fill('#fGarantie', today).catch(() => {});
    await page.fill('#fLieu', 'Boutique Test');
    await page.selectOption('#fAssurance', 'oui').catch(() => {});
    await page.fill('#fNotes', 'Note de test');

    // Click the Enregistrer button
    await Promise.all([
      deviceRequestPromise,
      page.click('button:has-text("Enregistrer")')
    ]);

    const req = await deviceRequestPromise;
    expect(req).toBeTruthy();

    const postData = req.postData();
    // For multipart/form-data we expect field names to appear in the body
    expect(postData).toContain('name="brand"');
    expect(postData).toContain('name="model"');
    expect(postData).toContain('Model X');
    expect(postData).toContain('name="serial_number_imei"');
    expect(postData).toContain('TEST-123456');
    expect(postData).toContain('name="assurance"');

    // Optionally, validate response status via waitForResponse (uncomment if backend running)
    // const res = await page.waitForResponse((r) => r.url().includes('/devices') && r.status() === 201);
    // expect(res.ok()).toBeTruthy();
  });
});
