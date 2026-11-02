# SharePay - Guide de démarrage rapide

## 📦 Installation et Configuration

### 1. Ajouter les variables d'environnement

Copiez `.env.example` vers `.env` et ajoutez vos clés SharePay:

```bash
# SharePay Configuration
SHAREPAY_MODE=test
SHAREPAY_API_KEY_TEST=sk_test_VOTRE_CLE_TEST
SHAREPAY_API_KEY_LIVE=sk_live_VOTRE_CLE_PRODUCTION
SHAREPAY_BASE_URL=https://sharepay-api.te-sea.com
SHAREPAY_WEBHOOK_SECRET=whsec_VOTRE_SECRET_WEBHOOK

# Activer SharePay (false par défaut)
ENABLE_SHAREPAY=true
PAYMENT_PROVIDER=SHAREPAY

# Types d'utilisateurs utilisant SharePay (vide = tous)
# Options: PARTNER, USER (séparés par virgule)
SHAREPAY_USER_TYPES=PARTNER
```

### 2. Exécuter la migration SQL

```bash
cd server
npm run migrate
# Ou manuellement:
psql -U postgres -d docmaster -f src/database/shema/68_add_provider_to_transactions.sql
```

### 3. Redémarrer le serveur

```bash
npm run dev
```

Vérifiez les logs au démarrage:
```
📋 [Features] Configuration:
   - USE_SHAREPAY: true
   - PAYMENT_PROVIDER: SHAREPAY
   - SHAREPAY_USER_TYPES: PARTNER
```

---

## 🔗 Configuration Dashboard SharePay

### 1. Créer une application

1. Connectez-vous sur https://sharepay.te-sea.com/merchant
2. Allez dans **Applications** > **Nouvelle application**
3. Notez les clés:
   - `sk_test_...` pour test
   - `sk_live_...` pour production

### 2. Configurer le webhook

1. Dans **Applications** > **Webhooks**
2. URL: `https://api.docmaster.cm/webhooks/sharepay-webhook`
3. Événements à cocher:
   - ✅ payment.created
   - ✅ payment.success
   - ✅ payment.failed
   - ✅ payment.cancelled
   - ✅ payment.expired
   - ✅ payout.created
   - ✅ payout.success
   - ✅ payout.failed
   - ✅ payout.cancelled

4. Notez le **Webhook Secret** (`whsec_...`)

### 3. Tester le webhook

Dans le dashboard SharePay:
1. Allez dans **Webhooks** > **Historique**
2. Cliquez sur **Envoyer événement de test**
3. Vérifiez les logs de votre serveur:

```
[SharePay Webhook] Event: webhook.test
```

---

## 🧪 Tests

### Test 1: Vérifier le service SharePay

```typescript
// server/test-sharepay.ts
import { getSharePayService } from './src/services/sharepay.service';

async function test() {
  const sharepay = getSharePayService();
  
  // Test checkout
  const session = await sharepay.createCheckout({
    amount: 1000,
    currency: 'XAF',
    description: 'Test DocMaster',
  });
  
  console.log('✅ Checkout créé:', session.paymentUrl);
  console.log('   Référence:', session.reference);
}

test().catch(console.error);
```

Exécuter:
```bash
npx tsx server/test-sharepay.ts
```

### Test 2: Simuler un webhook

```bash
curl -X POST http://localhost:5000/webhooks/sharepay-webhook \
  -H "Content-Type: application/json" \
  -H "X-Sharepay-Signature: t=1735900000,v1=FAKE_SIGNATURE" \
  -d '{
    "event": "webhook.test",
    "timestamp": "2026-10-07T12:00:00.000Z",
    "data": {}
  }'
```

### Test 3: Retrait utilisateur avec SharePay

1. Activez SharePay pour un utilisateur test:
```sql
-- Marquer un utilisateur comme testeur
UPDATE users SET email = 'test+sharepay@docmaster.cm' WHERE id = 'USER_ID';
```

2. Initiez un retrait via l'interface:
   - Montant: 1000 XAF
   - Méthode: MTN Mobile Money
   - Numéro: 237690000000

3. Vérifiez les logs:
```
[SharePay] POST /api/v1/pay-out/transfer
[SharePay] Response: { success: true, data: { reference: 'PO-...' } }
```

4. Simulez un succès via webhook:
```bash
curl -X POST http://localhost:5000/webhooks/sharepay-webhook \
  -H "Content-Type: application/json" \
  -H "X-Sharepay-Signature: t=$(date +%s),v1=$(echo -n '{"event":"payout.success"}' | openssl dgst -sha256 -hmac "$SHAREPAY_WEBHOOK_SECRET" | cut -d' ' -f2)" \
  -d '{
    "event": "payout.success",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "data": {
      "reference": "PO-REFERENCE_ICI",
      "status": "SUCCESS",
      "amount": 1000,
      "currency": "XAF",
      "paymentMethod": "MTN_MOMO_CM",
      "beneficiaryAccount": "237690000000",
      "beneficiaryName": "Test User"
    }
  }'
```

---

## 🔍 Debugging

### Vérifier l'état des features

```bash
curl http://localhost:5000/api/health
```

### Logs à surveiller

```bash
# Logs SharePay
grep "SharePay" logs/server.log

# Logs webhook
grep "SharePay Webhook" logs/server.log

# Erreurs
grep "ERROR" logs/server.log | grep -i sharepay
```

### Dashboard SharePay

1. **Transactions**: https://sharepay.te-sea.com/merchant/transactions
2. **Webhooks**: https://sharepay.te-sea.com/merchant/webhooks
3. **Logs**: https://sharepay.te-sea.com/merchant/logs

---

## ⚠️ Troubleshooting

### Erreur: "SharePay API key not found"

✅ Solution: Vérifiez que `.env` contient `SHAREPAY_API_KEY_TEST` ou `SHAREPAY_API_KEY_LIVE`

### Erreur: "Invalid signature" (webhook)

✅ Solutions:
1. Vérifiez que `SHAREPAY_WEBHOOK_SECRET` correspond au secret dans le dashboard
2. Assurez-vous que le body est envoyé en JSON brut (pas de parsing avant vérification)

### Retrait bloqué en PENDING

✅ Solutions:
1. Vérifiez les logs SharePay: https://sharepay.te-sea.com/merchant/logs
2. Vérifiez que le webhook est bien configuré
3. Vérifiez le solde disponible sur SharePay
4. Contactez le support SharePay

### Provider pas détecté

✅ Solution: Vérifiez la configuration des features:
```typescript
import { shouldUseSharePay } from './src/config/features';

console.log('Partner uses SharePay?', shouldUseSharePay('PARTNER'));
console.log('User uses SharePay?', shouldUseSharePay('USER'));
```

---

## 📊 Monitoring Production

### Métriques à surveiller

1. **Taux de succès des retraits SharePay**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'SUCCESS') * 100.0 / COUNT(*) as success_rate
FROM withdrawals
WHERE provider = 'SHAREPAY'
  AND created_at > NOW() - INTERVAL '24 hours';
```

2. **Temps moyen de traitement**
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) / 60 as avg_minutes
FROM withdrawals
WHERE provider = 'SHAREPAY'
  AND status = 'COMPLETED'
  AND processed_at IS NOT NULL;
```

3. **Webhooks reçus**
```sql
SELECT 
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE metadata->>'event' = 'payout.success') as success,
  COUNT(*) FILTER (WHERE metadata->>'event' = 'payout.failed') as failed
FROM wallet_transactions
WHERE provider = 'SHAREPAY'
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## 🚀 Passage en production

### Checklist

- [ ] Tester tous les scénarios en mode test
- [ ] Vérifier les webhooks fonctionnent
- [ ] Tester un retrait réel en test
- [ ] Configurer `SHAREPAY_MODE=live`
- [ ] Configurer `SHAREPAY_API_KEY_LIVE`
- [ ] Mettre à jour l'URL webhook (sans `/test`)
- [ ] Activer pour 10% utilisateurs
- [ ] Surveiller métriques pendant 24h
- [ ] Augmenter progressivement
- [ ] Désactiver NokashPay après 30 jours

---

*Guide créé le 7 octobre 2026*
