# Modifications Sidebar Admin & Chatbot i18n

## ✅ Modifications effectuées

### 1. AdminSidebar - Liens organisés par sections

Le sidebar admin a été réorganisé avec des sections comme le sidebar utilisateur normal:

**Sections créées:**
- **Primary**: Dashboard, Users, Document Types
- **Account**: Subscriptions, Transactions, Referrals, Withdrawals, Declarations, Matching
- **Gestion**: Autorités, Partenaires, Signalements (regroupés ensemble)
- **Communication**: SMS, Broadcast
- **Système**: Activity Log, Settings

**Fichier modifié:** `/src/components/admin/AdminSidebar.tsx`

### 2. ChatWidget - Support de la traduction (i18n)

Le chatbot prend maintenant en charge la traduction FR/EN:

**Modifications:**
- Import de `useI18n()` pour accéder à la langue et aux traductions
- Messages de bienvenue traduits
- Boutons de réponses rapides traduits
- Messages d'erreur traduits
- Labels et placeholders traduits
- Envoi de la langue actuelle au serveur backend

**Fichier modifié:** `/src/components/ui/ChatWidget.tsx`

**Clés i18n ajoutées (fr.ts & en.ts):**
```typescript
chatbot_welcome_1: "Bonjour ! Bienvenue sur Docmaster..." / "Hello! Welcome to Docmaster..."
chatbot_welcome_2: "Je suis votre assistant..." / "I am your Docmaster assistant..."
chatbot_quick_lost: "Déclarer un document perdu" / "Report a lost document"
chatbot_quick_find: "Retrouver un document" / "Find a document"
chatbot_quick_transfer: "Transfert d'appareil" / "Device transfer"
chatbot_quick_security: "Sécurité de mon compte" / "Account security"
chatbot_error: "Je suis désolé..." / "I'm sorry..."
chatbot_title: "Assistant Docmaster" / "Docmaster Assistant"
chatbot_status: "En ligne — réponse immédiate" / "Online — immediate response"
chatbot_open: "Ouvrir le chat" / "Open chat"
chatbot_close: "Fermer le chat" / "Close chat"
chatbot_send: "Envoyer" / "Send"
chatbot_placeholder: "Écrivez votre message…" / "Write your message…"
```

**Fichiers modifiés:**
- `/src/js/i18n/fr.ts`
- `/src/js/i18n/en.ts`

## ✅ Vérification SharePay

SharePay est correctement configuré et activé dans toute l'application:

### Configuration (.env)
```bash
ENABLE_SHAREPAY=true
PAYMENT_PROVIDER=SHAREPAY
SHAREPAY_MODE=live
SHAREPAY_API_KEY_LIVE=sk_live_876a2d72...
SHAREPAY_BASE_URL=https://sharepay-api.te-sea.com
SHAREPAY_WEBHOOK_SECRET=whsec_02afc8891127...
SHAREPAY_USER_TYPES=  # Vide = tous les utilisateurs
```

### Services actifs
1. **`/server/src/services/sharepay.service.ts`** - Service SharePay complet
2. **`/server/src/services/payout.service.ts`** - Service unifié qui utilise SharePay ou Nokash
3. **`/server/src/config/features.ts`** - Feature flags pour SharePay
4. **`/server/src/routes/sharepay-webhook.routes.ts`** - Webhook handler

### Callback URL SharePay
```
https://api-v2.docmaster.net/api/sharepay-webhook
```

À configurer dans le dashboard SharePay avec le secret:
```
whsec_02afc8891127e6e4c3bff080118d071c5a66619c0f753be0fa7595aa2c9a2bd8
```

### Événements webhook supportés
- `payment.success` - Paiement réussi
- `payment.failed` - Paiement échoué
- `payment.cancelled` - Paiement annulé
- `payment.expired` - Session expirée
- `payout.success` - Retrait réussi (✅ avec remboursement automatique)
- `payout.failed` - Retrait échoué (✅ avec remboursement automatique)
- `payout.cancelled` - Retrait annulé

### Intégration dans le code
- **Retraits utilisateurs**: `/server/src/controllers/withdrawal.controller.ts` ligne 433
- **Retraits partenaires**: Utilise le même service unifié `payoutService`
- **Paiements entrants**: Support créé via `sharepay.createCheckout()` et `sharepay.createCharge()`

### Logos Mobile Money
Les logos Orange et MTN sont affichés dans:
- Web: `/src/pages/auth/MesGains.tsx`, `/src/components/modals/PaymentModal.tsx`
- Flutter: `payment_method_sheet.dart`, `gains_screen.dart`

## ⚠️ Issue restante

**Erreur de build dans Recuperer.tsx ligne 1095**: Problème de syntaxe JSX à corriger.

## 📝 Notes
- Port 5000 nettoyé (processus tués)
- Toutes les traductions sont cohérentes FR/EN
- SharePay est le provider par défaut pour tous les utilisateurs
- Le chatbot envoie maintenant la langue au backend pour des réponses adaptées
