# Plan de migration - NokashPay → SharePay

## 📋 Vue d'ensemble

Migration de l'API de paiement de **NokashPay** vers **SharePay** pour DocMaster. SharePay offre une API REST moderne avec support des paiements entrants (Pay-In) et sortants (Pay-Out) via MTN Mobile Money et Orange Money au Cameroun.

---

## 🔍 Analyse de l'API SharePay

### Caractéristiques principales

**URL de base**: `https://sharepay-api.te-sea.com`

**Authentification**: Header `X-API-KEY` avec clés:
- `sk_test_••••••••` (Test)
- `sk_live_••••••••` (Production)

**Format de réponse standard**:
```json
{
  "success": boolean,
  "code": string,
  "message": string,
  "data": T | null,
  "timestamp": ISO8601
}
```

### Endpoints disponibles

#### 1. Pay-In (Paiements entrants)

**A. Checkout** - `POST /api/v1/pay-in/checkout`
- Génère un lien de paiement hébergé
- Session valable 30 minutes
- Le client choisit son opérateur sur la page

```json
{
  "amount": 5000,
  "currency": "XAF",
  "merchantReference": "CMD-2024-001",
  "description": "Paiement commande #001",
  "successUrl": "https://docmaster.cm/success",
  "cancelUrl": "https://docmaster.cm/cancel"
}
```

**B. Charge directe** - `POST /api/v1/pay-in/charge`
- Débit direct sans page web
- Nécessite provider + numéro client
- Support idempotency pour éviter doublons

```json
{
  "amount": 5000,
  "currency": "XAF",
  "paymentMethod": "MTN_MOMO_CM",
  "payerAccount": "237690000000",
  "payerName": "Jean Dupont",
  "idempotencyKey": "idem-cmd-001-v1"
}
```

**C. Vérification statut** - `GET /api/v1/pay-in/check_status/{reference}`
- Statuts: `PENDING`, `SUCCESS`, `FAILED`, `CANCELLED`, `REFUNDED`

#### 2. Pay-Out (Paiements sortants)

**A. Transfer** - `POST /api/v1/pay-out/transfer`
- Virement vers un bénéficiaire
- Montant prélevé du solde disponible

```json
{
  "amount": 10000,
  "currency": "XAF",
  "paymentMethod": "MTN_MOMO_CM",
  "beneficiaryAccount": "237690000000",
  "beneficiaryName": "Marie Martin",
  "description": "Remboursement client #001"
}
```

**B. Vérification statut** - `GET /api/v1/pay-out/check_status/{reference}`

#### 3. Webhooks

**Événements Pay-In**:
- `payment.created` - Session créée
- `payment.success` - Paiement confirmé
- `payment.failed` - Paiement échoué
- `payment.cancelled` - Session annulée
- `payment.expired` - Session expirée

**Événements Pay-Out**:
- `payout.created` - Virement initié
- `payout.success` - Virement réussi
- `payout.failed` - Virement échoué
- `payout.cancelled` - Virement annulé

**Signature HMAC-SHA256**: Header `X-Sharepay-Signature`
Format: `t=<epoch>,v1=<hmac-hex>`

---

## 🔄 Comparaison NokashPay vs SharePay

| Fonctionnalité | NokashPay | SharePay |
|---|---|---|
| **Pay-In Checkout** | ✅ `/collect` | ✅ `/pay-in/checkout` |
| **Pay-In Direct** | ❌ | ✅ `/pay-in/charge` |
| **Pay-Out** | ✅ `/payout` | ✅ `/pay-out/transfer` |
| **Webhooks** | ✅ | ✅ (avec signature HMAC) |
| **Idempotency** | ❓ | ✅ `idempotencyKey` |
| **Session expiration** | ❓ | ✅ 30 minutes |
| **Retry automatique** | ❓ | ✅ 5 tentatives max |
| **Format réponse** | Custom | ✅ Standard `ApiResponse<T>` |
| **URL retour** | ✅ | ✅ `successUrl` / `cancelUrl` |

---

## 🗂️ Architecture actuelle DocMaster

### Fichiers concernés

**Backend**:
- `/server/src/services/nokash.service.ts` - Service NokashPay actuel
- `/server/src/services/payments.service.ts` - Service de paiements générique
- `/server/src/controllers/payments.controller.ts` - Contrôleur paiements
- `/server/src/routes/payments.routes.ts` - Routes paiements
- `/server/src/routes/webhook.routes.ts` - Webhooks NokashPay

**Frontend**:
- `/src/services/paymentsService.ts` - Service frontend
- `/src/pages/auth/MesGains.tsx` - Page portefeuille utilisateur
- `/src/pages/partenaires/Retraits.tsx` - Page retraits partenaires
- `/src/pages/partenaires/Portefeuille.tsx` - Portefeuille partenaire

**Base de données** (tables concernées):
- `wallet_transactions` - Historique transactions
- `withdrawals` - Demandes de retrait
- `payment_methods` - Méthodes de paiement sauvegardées

---

## 📝 Plan d'implémentation

### Phase 1: Préparation (1-2 jours)

#### 1.1 Configuration environnement
```bash
# .env
SHAREPAY_API_KEY_TEST=sk_test_••••••••
SHAREPAY_API_KEY_LIVE=sk_live_••••••••
SHAREPAY_WEBHOOK_SECRET=whsec_••••••••
SHAREPAY_BASE_URL=https://sharepay-api.te-sea.com
SHAREPAY_MODE=test # ou 'live'
```

#### 1.2 Créer le service SharePay
Créer `/server/src/services/sharepay.service.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';

interface SharePayConfig {
  apiKey: string;
  baseUrl: string;
}

interface SharePayResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  timestamp: string;
}

interface CheckoutRequest {
  amount: number;
  currency: string;
  merchantReference?: string;
  description?: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface CheckoutResponse {
  reference: string;
  status: 'PENDING';
  amount: number;
  currency: string;
  description?: string;
  paymentUrl: string;
}

interface ChargeRequest {
  amount: number;
  currency: string;
  paymentMethod: 'MTN_MOMO_CM' | 'ORANGE_MONEY_CM';
  payerAccount: string;
  payerName?: string;
  payerEmail?: string;
  merchantReference?: string;
  description?: string;
  idempotencyKey?: string;
}

interface TransferRequest {
  amount: number;
  currency: string;
  paymentMethod: 'MTN_MOMO_CM' | 'ORANGE_MONEY_CM';
  beneficiaryAccount: string;
  beneficiaryName: string;
  beneficiaryEmail?: string;
  merchantReference?: string;
  description?: string;
}

interface TransactionStatus {
  reference: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  amount: number;
  currency: string;
  paymentMethod?: string;
  [key: string]: any;
}

export class SharePayService {
  private client: AxiosInstance;

  constructor(config: SharePayConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      timeout: 30000,
    });
  }

  /**
   * Créer une session de paiement checkout (avec page hébergée)
   */
  async createCheckout(params: CheckoutRequest): Promise<CheckoutResponse> {
    const { data } = await this.client.post<SharePayResponse<CheckoutResponse>>(
      '/api/v1/pay-in/checkout',
      params
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Échec de création du checkout');
    }
    
    return data.data;
  }

  /**
   * Initier un paiement direct (charge)
   */
  async createCharge(params: ChargeRequest): Promise<TransactionStatus> {
    const { data } = await this.client.post<SharePayResponse<TransactionStatus>>(
      '/api/v1/pay-in/charge',
      params
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Échec d\'initiation du paiement');
    }
    
    return data.data;
  }

  /**
   * Vérifier le statut d'un paiement entrant
   */
  async getPayInStatus(reference: string): Promise<TransactionStatus> {
    const { data } = await this.client.get<SharePayResponse<TransactionStatus>>(
      `/api/v1/pay-in/check_status/${reference}`
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Échec de récupération du statut');
    }
    
    return data.data;
  }

  /**
   * Créer un virement (payout)
   */
  async createTransfer(params: TransferRequest): Promise<TransactionStatus> {
    const { data } = await this.client.post<SharePayResponse<TransactionStatus>>(
      '/api/v1/pay-out/transfer',
      params
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Échec d\'initiation du virement');
    }
    
    return data.data;
  }

  /**
   * Vérifier le statut d'un paiement sortant
   */
  async getPayOutStatus(reference: string): Promise<TransactionStatus> {
    const { data } = await this.client.get<SharePayResponse<TransactionStatus>>(
      `/api/v1/pay-out/check_status/${reference}`
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Échec de récupération du statut');
    }
    
    return data.data;
  }

  /**
   * Vérifier la signature webhook HMAC-SHA256
   */
  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');
    
    // Format: "t=1735900000,v1=9f8c3a..."
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => p.split('='))
    );
    
    if (!parts.v1) return false;
    
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(parts.v1, 'hex'),
      Buffer.from(digest, 'hex')
    );
  }
}

// Instance singleton
let sharePayInstance: SharePayService | null = null;

export function getSharePayService(): SharePayService {
  if (!sharePayInstance) {
    const apiKey = process.env.SHAREPAY_MODE === 'live'
      ? process.env.SHAREPAY_API_KEY_LIVE!
      : process.env.SHAREPAY_API_KEY_TEST!;
    
    sharePayInstance = new SharePayService({
      apiKey,
      baseURL: process.env.SHAREPAY_BASE_URL || 'https://sharepay-api.te-sea.com',
    });
  }
  
  return sharePayInstance;
}
```

### Phase 2: Adaptation du code existant (2-3 jours)

#### 2.1 Modifier `payments.service.ts`

Ajouter un provider abstrait pour basculer entre NokashPay et SharePay:

```typescript
enum PaymentProvider {
  NOKASH = 'NOKASH',
  SHAREPAY = 'SHAREPAY',
}

class PaymentsService {
  private provider: PaymentProvider;
  
  constructor() {
    this.provider = process.env.PAYMENT_PROVIDER === 'SHAREPAY' 
      ? PaymentProvider.SHAREPAY 
      : PaymentProvider.NOKASH;
  }
  
  async initiateWithdrawal(params: WithdrawalParams) {
    if (this.provider === PaymentProvider.SHAREPAY) {
      return this.initiateWithdrawalSharePay(params);
    } else {
      return this.initiateWithdrawalNokash(params);
    }
  }
  
  private async initiateWithdrawalSharePay(params: WithdrawalParams) {
    const sharepay = getSharePayService();
    
    const paymentMethod = params.method === 'MTN' 
      ? 'MTN_MOMO_CM' 
      : 'ORANGE_MONEY_CM';
    
    const result = await sharepay.createTransfer({
      amount: Math.round(params.amount),
      currency: 'XAF',
      paymentMethod,
      beneficiaryAccount: params.phone,
      beneficiaryName: params.name,
      merchantReference: `WITHDRAW-${params.withdrawalId}`,
      description: `Retrait DocMaster - ${params.name}`,
    });
    
    return {
      reference: result.reference,
      status: result.status,
      provider: 'SHAREPAY',
    };
  }
}
```

#### 2.2 Créer route webhook SharePay

Créer `/server/src/routes/sharepay-webhook.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { getSharePayService } from '../services/sharepay.service.ts';
import { paymentsService } from '../services/payments.service.ts';

const router = Router();

router.post('/sharepay-webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-sharepay-signature'] as string;
    const rawBody = JSON.stringify(req.body);
    
    const sharepay = getSharePayService();
    const isValid = sharepay.verifyWebhookSignature(
      rawBody,
      signature,
      process.env.SHAREPAY_WEBHOOK_SECRET!
    );
    
    if (!isValid) {
      console.error('[SharePay Webhook] Signature invalide');
      return res.status(401).json({ error: 'Signature invalide' });
    }
    
    const { event, data, timestamp } = req.body;
    
    console.log(`[SharePay Webhook] ${event}`, { reference: data.reference, timestamp });
    
    switch (event) {
      case 'payment.success':
        await paymentsService.handlePaymentSuccess(data, 'SHAREPAY');
        break;
      
      case 'payment.failed':
        await paymentsService.handlePaymentFailed(data, 'SHAREPAY');
        break;
      
      case 'payout.success':
        await paymentsService.handlePayoutSuccess(data, 'SHAREPAY');
        break;
      
      case 'payout.failed':
        await paymentsService.handlePayoutFailed(data, 'SHAREPAY');
        break;
      
      default:
        console.log(`[SharePay Webhook] Événement non géré: ${event}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[SharePay Webhook] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### 2.3 Mettre à jour la table `wallet_transactions`

Ajouter colonne `provider`:

```sql
-- Migration: add provider column
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'NOKASH';

-- Index pour faciliter les requêtes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider 
ON wallet_transactions(provider);
```

### Phase 3: Testing (2-3 jours)

#### 3.1 Tests unitaires

Créer `/server/tests/sharepay.service.test.ts`:

```typescript
import { SharePayService } from '../src/services/sharepay.service';

describe('SharePayService', () => {
  let service: SharePayService;
  
  beforeAll(() => {
    service = new SharePayService({
      apiKey: process.env.SHAREPAY_API_KEY_TEST!,
      baseUrl: 'https://sharepay-api.te-sea.com',
    });
  });
  
  it('should create checkout session', async () => {
    const result = await service.createCheckout({
      amount: 1000,
      currency: 'XAF',
      description: 'Test checkout',
    });
    
    expect(result.reference).toMatch(/^PI-/);
    expect(result.status).toBe('PENDING');
    expect(result.paymentUrl).toContain('checkout.sharepay');
  });
  
  it('should create direct charge', async () => {
    const result = await service.createCharge({
      amount: 1000,
      currency: 'XAF',
      paymentMethod: 'MTN_MOMO_CM',
      payerAccount: '237690000000',
      payerName: 'Test User',
      idempotencyKey: `test-${Date.now()}`,
    });
    
    expect(result.reference).toMatch(/^PI-/);
    expect(result.status).toBe('PENDING');
  });
  
  it('should verify webhook signature', () => {
    const secret = 'test-secret';
    const body = JSON.stringify({ event: 'payment.success', data: {} });
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const signature = `t=${Math.floor(Date.now() / 1000)},v1=${hmac}`;
    
    const isValid = service.verifyWebhookSignature(body, signature, secret);
    expect(isValid).toBe(true);
  });
});
```

#### 3.2 Tests d'intégration

- Test de retrait utilisateur via SharePay
- Test de retrait partenaire via SharePay
- Test de webhooks avec événements simulés
- Test de basculement NokashPay ↔ SharePay

### Phase 4: Déploiement progressif (1-2 jours)

#### 4.1 Feature flag

```typescript
// config/features.ts
export const FEATURES = {
  USE_SHAREPAY: process.env.ENABLE_SHAREPAY === 'true',
  SHAREPAY_USER_TYPES: (process.env.SHAREPAY_USER_TYPES || '').split(','), // ['PARTNER', 'USER']
};

// Utilisation
if (FEATURES.USE_SHAREPAY && FEATURES.SHAREPAY_USER_TYPES.includes(userType)) {
  // Utiliser SharePay
} else {
  // Utiliser NokashPay
}
```

#### 4.2 Rollout progressif

1. **Jour 1**: Activer SharePay pour 10% partenaires (test)
2. **Jour 3**: Augmenter à 30% partenaires
3. **Jour 5**: 100% partenaires
4. **Jour 7**: Activer pour 10% utilisateurs
5. **Jour 10**: 100% utilisateurs
6. **Jour 14**: Désactiver NokashPay complètement

### Phase 5: Migration des données historiques (optionnel)

Si nécessaire, mapper les anciennes références NokashPay vers le nouveau format:

```sql
-- Table de mapping (optionnel)
CREATE TABLE payment_reference_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nokash_reference VARCHAR(100),
  sharepay_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ⚠️ Points d'attention

### 1. Changements de comportement

| Aspect | NokashPay | SharePay | Action |
|---|---|---|---|
| **Format référence** | Custom | `PI-` / `PO-` prefix | Adapter parsers |
| **Timeout session** | Variable | 30 min fixe | Ajuster UX |
| **Retry logic** | Manuel | Auto (5x) | Documenter |
| **Webhook signature** | ❓ | HMAC-SHA256 obligatoire | Implémenter vérification |

### 2. Gestion des erreurs

SharePay utilise des codes d'erreur standardisés:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `INSUFFICIENT_BALANCE` (409)
- `MTN_GATEWAY_ERROR` / `ORANGE_GATEWAY_ERROR` (502)

Créer un mapping vers les messages utilisateurs français:

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'VALIDATION_ERROR': 'Données invalides. Vérifiez les informations saisies.',
  'INSUFFICIENT_BALANCE': 'Solde insuffisant pour effectuer ce retrait.',
  'MTN_GATEWAY_ERROR': 'Service MTN temporairement indisponible. Réessayez plus tard.',
  'ORANGE_GATEWAY_ERROR': 'Service Orange Money temporairement indisponible.',
  'RATE_LIMIT_EXCEEDED': 'Trop de tentatives. Veuillez patienter quelques minutes.',
};
```

### 3. Monitoring

Ajouter des métriques pour comparer les performances:

```typescript
// Métriques à tracker
- sharepay_transactions_total (counter)
- sharepay_transactions_success_rate (gauge)
- sharepay_transaction_duration_seconds (histogram)
- sharepay_webhook_received_total (counter)
- sharepay_webhook_signature_invalid_total (counter)
```

### 4. Configuration dashboard SharePay

Dans le dashboard SharePay, configurer:
- ✅ URL webhook: `https://api.docmaster.cm/webhooks/sharepay-webhook`
- ✅ Événements: Tous (payment.*, payout.*)
- ✅ Retry policy: 5 tentatives (default)
- ✅ IPs autorisées (whitelist)

---

## 📊 Checklist de migration

### Développement
- [ ] Créer `sharepay.service.ts`
- [ ] Adapter `payments.service.ts` avec provider abstrait
- [ ] Créer route webhook SharePay
- [ ] Ajouter colonne `provider` dans DB
- [ ] Créer migration SQL
- [ ] Ajouter variables d'environnement
- [ ] Implémenter feature flags
- [ ] Créer tests unitaires
- [ ] Créer tests d'intégration

### Configuration
- [ ] Obtenir clés API SharePay (test + live)
- [ ] Configurer webhook URL dans dashboard SharePay
- [ ] Tester webhooks avec outil SharePay
- [ ] Configurer retry policy
- [ ] Whitelist IPs backend

### Testing
- [ ] Test checkout session
- [ ] Test direct charge
- [ ] Test payout/transfer
- [ ] Test webhooks (success/fail)
- [ ] Test signature verification
- [ ] Test idempotency
- [ ] Test timeout (30 min)
- [ ] Test erreurs (balance insuffisante, etc.)

### Déploiement
- [ ] Déployer sur environnement test
- [ ] Rollout progressif partenaires (10% → 100%)
- [ ] Rollout progressif utilisateurs (10% → 100%)
- [ ] Monitoring métriques (success rate, durée, erreurs)
- [ ] Comparer performances NokashPay vs SharePay
- [ ] Documentation interne
- [ ] Désactiver NokashPay

### Post-migration
- [ ] Supprimer code NokashPay (après 30 jours)
- [ ] Archiver données NokashPay
- [ ] Mettre à jour documentation
- [ ] Former équipe support

---

## 🚀 Estimation temporelle

| Phase | Durée | Responsable |
|---|---|---|
| Phase 1: Préparation | 1-2 jours | Backend dev |
| Phase 2: Adaptation code | 2-3 jours | Backend + Frontend dev |
| Phase 3: Testing | 2-3 jours | QA + Dev |
| Phase 4: Déploiement progressif | 1-2 semaines | DevOps + PM |
| Phase 5: Migration données | 1 jour (optionnel) | Backend dev |

**Total estimé**: 2-3 semaines (incluant rollout progressif)

---

## 📞 Support

- **Documentation SharePay**: https://sharepay.te-sea.com/merchant/docs
- **Dashboard SharePay**: https://sharepay.te-sea.com/merchant
- **Support technique**: support@sharepay.cm (à confirmer)

---

*Document créé le 7 octobre 2026*
*Dernière mise à jour: 7 octobre 2026*
