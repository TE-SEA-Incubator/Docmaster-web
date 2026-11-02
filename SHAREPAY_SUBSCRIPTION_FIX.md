# Fix SharePay pour les Souscriptions

## ❌ Problème identifié

Le endpoint `/api/subscriptions/subscribe` utilisait toujours **Nokash** au lieu de **SharePay**, même avec `ENABLE_SHAREPAY=true`.

**Log d'erreur:**
```
📱 [Nokash] Phone normalized: 697407380 => 237697407380 operator: ORANGE_MONEY
🚀 [Nokash Response] {
  "status": "REQUEST_BAD_INFOS",
  "message": "Erreur 01: votre entreprise n'est pas encore validé"
}
```

## ✅ Solution appliquée

### 1. Service de souscription mis à jour

**Fichier:** `/server/src/services/subscription.service.ts`

**Modifications:**
- Supprimé l'import direct de `nokashService`
- Ajouté l'import de `getPaymentProvider` depuis `features.ts`
- Ajout de la logique conditionnelle SharePay vs Nokash:

```typescript
const provider = getPaymentProvider('USER');

if (provider === 'SHAREPAY') {
  // Utilise SharePay avec createCharge (débit direct)
  const sharepay = getSharePayService();
  const result = await sharepay.createCharge({
    amount: Math.round(amountToPay),
    currency: 'XAF',
    paymentMethod: 'ORANGE_MONEY_CM' | 'MTN_MOMO_CM',
    payerAccount: paymentDetails.phone,
    merchantReference: orderId,
    idempotencyKey: orderId,
  });
  // Transaction créée avec provider: 'SHAREPAY'
  // Webhook activera l'abonnement automatiquement
} else {
  // Fallback sur Nokash (legacy)
  const nokashService = require('./nokash.service.js');
  // ... code Nokash existant ...
}
```

### 2. Webhook SharePay amélioré

**Fichier:** `/server/src/routes/sharepay-webhook.routes.ts`

**Fonction `handlePaymentSuccess` mise à jour:**
- Récupère les métadonnées de la transaction
- Si `planId` et `months` sont présents → **active automatiquement l'abonnement**
- Évite le polling manuel côté serveur

```typescript
async function handlePaymentSuccess(data: any) {
  // Update transaction status
  const txResult = await pool.query(
    `UPDATE wallet_transactions SET status = 'SUCCESS' ... RETURNING user_id, metadata`
  );

  // Auto-activate subscription si c'est un paiement d'abonnement
  if (metadata.planId && metadata.months) {
    await subscriptionService.activateSubscription(
      tx.user_id, 
      metadata.planId, 
      metadata.months
    );
  }
}
```

## 🔄 Flux de paiement SharePay

1. **Utilisateur** → Clique sur "S'abonner" (plan Pro, 12 mois)
2. **Frontend** → POST `/api/subscriptions/subscribe` avec:
   ```json
   {
     "planId": "premium",
     "months": 12,
     "paymentMethod": "ORANGE_MONEY",
     "phone": "697407380"
   }
   ```
3. **Backend** → 
   - Vérifie `getPaymentProvider('USER')` → retourne `'SHAREPAY'`
   - Appelle `sharepay.createCharge()`
   - Crée transaction avec `provider: 'SHAREPAY'`, `status: 'PENDING'`
   - Retourne `{ status: 'PENDING_PAYMENT', transactionId: '...' }`
4. **SharePay** → Envoie push notification au téléphone de l'utilisateur
5. **Utilisateur** → Valide le paiement sur son téléphone
6. **SharePay** → Envoie webhook `payment.success` à `https://api-v2.docmaster.net/api/sharepay-webhook`
7. **Webhook** →
   - Vérifie la signature HMAC
   - Met à jour la transaction: `status: 'SUCCESS'`
   - **Active automatiquement l'abonnement** via `subscriptionService.activateSubscription()`
8. **Utilisateur** → Reçoit notification "Abonnement activé!" ✅

## 🎯 Avantages vs Nokash

| Feature | Nokash (avant) | SharePay (maintenant) |
|---------|----------------|----------------------|
| Validation entreprise | ❌ "pas encore validé" | ✅ Validé et actif |
| Webhook fiable | ⚠️ Polling nécessaire | ✅ Webhook instantané |
| Support Orange/MTN | ⚠️ Limité | ✅ Complet |
| Status temps réel | ❌ Polling toutes les 2min | ✅ Instantané |
| Activation auto | ❌ Polling manuel | ✅ Webhook auto |

## 📋 Configuration requise

Dans `.env`:
```bash
ENABLE_SHAREPAY=true
PAYMENT_PROVIDER=SHAREPAY
SHAREPAY_MODE=live
SHAREPAY_API_KEY_LIVE=sk_live_876a2d72...
SHAREPAY_WEBHOOK_SECRET=whsec_02afc8891127...
```

Dans le dashboard SharePay:
- **Webhook URL**: `https://api-v2.docmaster.net/api/sharepay-webhook`
- **Events**: `payment.success`, `payment.failed`, `payment.cancelled`

## ✅ Tests recommandés

1. Tester souscription Orange Money (plan Pro)
2. Tester souscription MTN MoMo (plan Premium)
3. Vérifier activation automatique après paiement
4. Vérifier notifications utilisateur
5. Vérifier logs webhook SharePay

## 📝 Notes

- Le code Nokash reste en fallback si `ENABLE_SHAREPAY=false`
- Les transactions stockent le provider (`SHAREPAY` ou `NOKASH`) dans les métadonnées
- Le webhook SharePay gère aussi les retraits (payouts) via `handlePayoutSuccess`
