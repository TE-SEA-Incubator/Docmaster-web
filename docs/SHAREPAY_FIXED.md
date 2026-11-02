# ✅ SharePay Intégration - Correction appliquée

## Problème identifié

Le serveur utilisait toujours **NokashPay** malgré la configuration `PAYMENT_PROVIDER=SHAREPAY` dans `.env`.

### Cause racine

Le fichier `server/src/controllers/withdrawal.controller.ts` appelait **directement** `nokashPayoutService.initiatePayout()` au lieu d'utiliser le service unifié `payoutService.initiatePayout()` qui gère le switch automatique entre providers.

```typescript
// ❌ AVANT (ligne 433)
const payoutRes = await nokashPayoutService.initiatePayout({
  amount: Number(createdWithdrawal.amount),
  order_id: createdWithdrawal.id,
  user_phone: createdWithdrawal.payment_details,
  payment_method: createdWithdrawal.payment_method,
});
```

## Correction appliquée

### 1. Remplacement du service direct par le service unifié

```typescript
// ✅ APRÈS
const payoutRes = await payoutService.initiatePayout({
  amount: Number(createdWithdrawal.amount),
  order_id: createdWithdrawal.id,
  user_phone: createdWithdrawal.payment_details,
  payment_method: createdWithdrawal.payment_method,
});
```

### 2. Mise à jour des imports

```typescript
// ❌ Supprimé
import { nokashPayoutService } from '../services/nokash-payout.service.ts';

// ✅ Conservé (déjà présent)
import { payoutService } from '../services/payout.service.js';
```

### 3. Messages génériques (provider-agnostic)

Tous les messages et logs ont été rendus génériques :

- `"Nokash Payout initié"` → `"Paiement initié"`
- `"Échec initiation Nokash"` → `"Échec initiation paiement"`
- `nokashId` → `paymentRef`
- `INITIATE_NOKASH_PAYOUT` → `INITIATE_PAYOUT`

## Comment le service unifié fonctionne

Le `payoutService.initiatePayout()` détecte automatiquement quel provider utiliser :

```typescript
// server/src/services/payout.service.ts
async initiatePayout(request: PayoutRequest): Promise<PayoutResponse> {
  const provider = getPaymentProvider(request.user_id, request.user_role);
  
  if (provider === 'SHAREPAY') {
    return this.initiatePayoutSharePay(request);
  } else {
    return this.initiatePayoutNokash(request);
  }
}
```

La fonction `getPaymentProvider()` vérifie :
1. `PAYMENT_PROVIDER` dans `.env` (SHAREPAY ou NOKASH)
2. `SHAREPAY_USER_TYPES` pour filtrer par type d'utilisateur
3. `ENABLE_SHAREPAY` pour activer/désactiver globalement

## Configuration actuelle

```bash
# server/.env
ENABLE_SHAREPAY=true
PAYMENT_PROVIDER=SHAREPAY
SHAREPAY_USER_TYPES=              # Vide = tous les utilisateurs
SHAREPAY_MODE=live
```

**Résultat** : Tous les retraits utilisent maintenant SharePay automatiquement.

## Vérification après redémarrage

Après `pm2 restart docmaster-api`, les logs devraient montrer :

```
✅ [SharePay] Initiating payout for order WITHDRAWAL_ID
✅ [SharePay] Payout created successfully: REF_XXXX
```

Au lieu de :

```
❌ [Nokash Payout Auth Error]: Connect Timeout Error
```

## Tests à effectuer

1. **Créer un retrait** depuis l'application
2. **Vérifier les logs** : `pm2 logs docmaster-api | grep SharePay`
3. **Vérifier la base de données** :
   ```sql
   SELECT id, amount, status, provider, provider_reference
   FROM withdrawals
   ORDER BY created_at DESC
   LIMIT 1;
   -- Le champ 'provider' doit être 'SHAREPAY'
   ```

## Prochaines étapes

1. Redémarrer le serveur : `pm2 restart docmaster-api`
2. Tester un retrait réel
3. Configurer le webhook dans SharePay Dashboard (si pas encore fait)
4. Monitorer les premiers paiements

---

**Date** : 2026-11-02  
**Fichiers modifiés** :
- `server/src/controllers/withdrawal.controller.ts`

**Status** : ✅ Corrigé et compilé avec succès
