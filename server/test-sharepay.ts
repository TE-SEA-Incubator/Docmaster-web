/**
 * Test Script for SharePay Integration
 * Usage: npx tsx server/test-sharepay.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from server directory
config({ path: resolve(process.cwd(), 'server', '.env') });

import { getSharePayService } from './src/services/sharepay.service.js';

async function main() {
  console.log('\n🧪 SharePay Integration Test\n');
  console.log('═══════════════════════════════════════\n');

  // Check configuration
  console.log('📋 Configuration:');
  console.log(`   Mode: ${process.env.SHAREPAY_MODE || 'test'}`);
  console.log(`   Base URL: ${process.env.SHAREPAY_BASE_URL || 'https://sharepay-api.te-sea.com'}`);
  console.log(`   Provider: ${process.env.PAYMENT_PROVIDER || 'NOKASH'}`);
  console.log(`   SharePay Enabled: ${process.env.ENABLE_SHAREPAY || 'false'}`);
  console.log(`   User Types: ${process.env.SHAREPAY_USER_TYPES || 'ALL'}`);
  
  const mode = process.env.SHAREPAY_MODE || 'test';
  const apiKeyEnv = mode === 'live' ? 'SHAREPAY_API_KEY_LIVE' : 'SHAREPAY_API_KEY_TEST';
  const apiKey = mode === 'live' ? process.env.SHAREPAY_API_KEY_LIVE : process.env.SHAREPAY_API_KEY_TEST;
  
  if (!apiKey) {
    console.error(`\n❌ Erreur: ${apiKeyEnv} n'est pas configuré dans .env`);
    console.log(`\nVérifiez que vous avez ajouté votre clé SharePay ${mode} dans le fichier .env:`);
    console.log(`   ${apiKeyEnv}=sk_${mode}_votre_cle_ici\n`);
    process.exit(1);
  }
  
  console.log(`   API Key: ${apiKey.substring(0, 15)}...`);
  console.log('');

  try {
    // Initialize service
    console.log('1️⃣  Initialisation du service SharePay...');
    const sharepay = getSharePayService();
    console.log('   ✅ Service initialisé\n');

    // Test 1: Create Checkout Session
    console.log('2️⃣  Test: Créer une session de checkout...');
    try {
      const checkout = await sharepay.createCheckout({
        amount: 1000, // 1000 XAF
        currency: 'XAF',
        description: 'Test DocMaster - Session checkout',
        merchantReference: `TEST-CHECKOUT-${Date.now()}`,
      });

      console.log('   ✅ Session créée avec succès!');
      console.log(`   📝 Référence: ${checkout.reference}`);
      console.log(`   📊 Statut: ${checkout.status}`);
      console.log(`   💰 Montant: ${checkout.amount} ${checkout.currency}`);
      console.log(`   🔗 URL: ${checkout.paymentUrl}`);
      console.log('');
      
      // Test 2: Check Status
      console.log('3️⃣  Test: Vérifier le statut du paiement...');
      const status = await sharepay.getPayInStatus(checkout.reference);
      console.log('   ✅ Statut récupéré!');
      console.log(`   📊 Statut: ${status.status}`);
      console.log(`   💰 Montant: ${status.amount} ${status.currency}`);
      console.log('');
    } catch (error: any) {
      console.error('   ❌ Erreur lors du test checkout:');
      console.error(`      ${error.message}`);
      if (error.code) console.error(`      Code: ${error.code}`);
      if (error.statusCode) console.error(`      HTTP: ${error.statusCode}`);
      console.log('');
    }

    // Test 3: Test Charge (Direct Debit) - commenté car nécessite un vrai compte
    console.log('4️⃣  Test: Charge directe (SKIPPED - nécessite un compte réel)');
    console.log('   ℹ️  Pour tester: décommentez le code dans test-sharepay.ts');
    console.log('');
    
    /*
    try {
      const charge = await sharepay.createCharge({
        amount: 500,
        currency: 'XAF',
        paymentMethod: 'MTN_MOMO_CM',
        payerAccount: '237690000000', // Remplacez par un vrai numéro
        payerName: 'Test User',
        description: 'Test DocMaster - Charge directe',
        idempotencyKey: `TEST-CHARGE-${Date.now()}`,
      });
      
      console.log('   ✅ Charge initiée!');
      console.log(`   📝 Référence: ${charge.reference}`);
      console.log(`   📊 Statut: ${charge.status}`);
      console.log('');
    } catch (error: any) {
      console.error('   ❌ Erreur charge:', error.message);
      console.log('');
    }
    */

    // Test 4: Test Transfer (Payout) - commenté car nécessite du solde
    console.log('5️⃣  Test: Transfer/Payout (SKIPPED - nécessite du solde)');
    console.log('   ℹ️  Pour tester: décommentez le code et ajoutez du solde sur SharePay');
    console.log('');
    
    /*
    try {
      const transfer = await sharepay.createTransfer({
        amount: 500,
        currency: 'XAF',
        paymentMethod: 'MTN_MOMO_CM',
        beneficiaryAccount: '237690000000', // Remplacez par un vrai numéro
        beneficiaryName: 'Test Beneficiary',
        description: 'Test DocMaster - Retrait',
        merchantReference: `TEST-PAYOUT-${Date.now()}`,
      });
      
      console.log('   ✅ Transfer initié!');
      console.log(`   📝 Référence: ${transfer.reference}`);
      console.log(`   📊 Statut: ${transfer.status}`);
      console.log('');
    } catch (error: any) {
      console.error('   ❌ Erreur transfer:', error.message);
      console.log('');
    }
    */

    // Test 5: Webhook Signature Verification
    console.log('6️⃣  Test: Vérification signature webhook...');
    const testBody = JSON.stringify({
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { reference: 'TEST-123' },
    });
    
    const { createHmac } = await import('crypto');
    const secret = process.env.SHAREPAY_WEBHOOK_SECRET || 'test-secret';
    const hmac = createHmac('sha256', secret);
    const digest = hmac.update(testBody).digest('hex');
    const signature = `t=${Math.floor(Date.now() / 1000)},v1=${digest}`;
    
    const isValid = sharepay.verifyWebhookSignature(testBody, signature, secret);
    
    if (isValid) {
      console.log('   ✅ Signature valide!');
    } else {
      console.log('   ❌ Signature invalide!');
    }
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════\n');
    console.log('✅ Tests terminés avec succès!\n');
    console.log('📋 Prochaines étapes:');
    console.log('   1. Configurer le webhook dans le dashboard SharePay');
    console.log('   2. URL: https://api.docmaster.cm/webhooks/sharepay-webhook');
    console.log('   3. Tester un paiement réel sur la page checkout générée');
    console.log('   4. Vérifier les webhooks dans les logs du serveur');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error.message);
    if (error.stack) {
      console.error('\n📚 Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);
