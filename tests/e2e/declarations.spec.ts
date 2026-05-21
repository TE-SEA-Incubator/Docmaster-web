import { test, expect } from '@playwright/test';

test('déclaration perte - flux principal', async ({ page }) => {
  // Aller sur la page de déclaration
  await page.goto('/declarer.html');
  await page.waitForSelector('.submit-btn');

  // Choisir "Pour moi-même"
  await page.click('#ownerMe');

  // Sélectionner le premier type de document
  await page.click('#docTypeGrid .doc-type-card');

  // Aller aux étapes suivantes (2 -> 3 -> 4 -> contact)
  await page.click('#nextStepBtn');
  await page.click('#nextStepBtn');
  await page.click('#nextStepBtn');

  // Remplir les champs essentiels
  await page.fill('#ville', 'Douala');
  await page.fill('#contactPhone', '+237650000000');

  // Cocher la case d'acceptation
  await page.click('#checkboxUI');

  // Intercepter la requête POST de création et renvoyer une réponse mock
  await page.route('**/declarations/lost', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { data: { identifiant_doc_dm: 'DOC-PLAY-123' } } }),
    });
  });

  // Cliquer sur Soumettre (ouvre la modal de confirmation)
  await page.click('.submit-btn');
  await page.waitForSelector('#confirmOverlay.show');

  // Confirmer avec mot de passe et valider
  await page.fill('#confirmPassword', '1234');
  await page.click('#finalSubmitBtn');

  // Attendre le succès
  await page.waitForSelector('#successOverlay.show', { timeout: 10000 });
  const ref = await page.textContent('#refNumber');
  expect(ref).toContain('DOC-PLAY-123');
});
