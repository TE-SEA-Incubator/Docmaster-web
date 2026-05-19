# Guide d'Intégration - Workflow de Récupération DocMaster

## 🎯 Vue d'ensemble

Ce guide décrit l'intégration complète du workflow de récupération de documents dans DocMaster, connectant le frontend et le backend via une API centralisée.

## 📁 Structure des fichiers

### Backend (TypeScript)
```
server/
├── src/
│   ├── controllers/claim.controller.ts      # Gestion des claims
│   ├── controllers/payment.controller.ts    # Gestion des paiements
│   ├── repositories/claim.repository.ts     # Base de données claims
│   ├── services/matching.service.ts          # Matching automatique
│   └── routes/
│       ├── claim.routes.ts                  # Routes claims
│       └── payment.routes.ts                # Routes paiements
└── types/database.ts                         # Types TypeScript
```

### Frontend (JavaScript)
```
src/
├── js/
│   └── services/
│       ├── api.js                           # API centralisée ⭐
│       ├── recovery.js                      # Service récupération ⭐
│       └── recovery-workflow-example.js     # Exemples d'utilisation
├── recuperer.html                           # Interface propriétaire ⭐
└── recuperation.html                        # Interface trouveur ⭐
```

## 🔄 Workflow Complet

### 1. Matching Automatique (Backend)
```typescript
// matching.service.ts
async handleHighConfidenceMatch(d1, d2) {
  // 1. Mettre à jour les statuts à 'MATCHED'
  // 2. Créer automatiquement un claim
  // 3. Générer un code de vérification
  // 4. Notifier les utilisateurs
}
```

### 2. Paiement (Propriétaire)
```javascript
// recuperer.html + recovery.js
async completeOwnerWorkflow(docId) {
  // 1. Vérifier si un claim existe
  // 2. Traiter le paiement (5000 FCFA)
  // 3. Révéler le code de vérification
  // 4. Mettre à jour l'UI
}
```

### 3. Validation (Trouveur)
```javascript
// recuperation.html + recovery.js
async validateCode(docId, code) {
  // 1. Valider le code de 4 chiffres
  // 2. Mettre à jour le statut du claim
  // 3. Confirmer la remise
  // 4. Verser les gains
}
```

## 🛠️ API Centralisée (`api.js`)

### Claims
```javascript
// Créer un claim manuellement
createClaim({ docId, ownerId, finderId })

// Obtenir le claim actif d'un document
getActiveClaim(docId)

// Valider le code de récupération
validateRecoveryCode({ docId, code })
```

### Paiements
```javascript
// Payer les frais de récupération
payRecoveryFee({ docId, amount, paymentMethod })

// Historique des transactions
getMyTransactions()
```

### Déclarations
```javascript
// Initier le processus de récupération
initiateRecovery(docId)
```

## 🎨 Interfaces Utilisateur

### `recuperer.html` - Propriétaire
- **Affichage**: Document trouvé, informations du trouveur (floutées)
- **Action**: Bouton "Payer & Récupérer" 
- **Processus**: Paiement → Révélation code → Instructions de retrait
- **URL**: `/recuperer.html?id=DOC_ID&view=owner`

### `recuperation.html` - Trouveur  
- **Affichage**: Historique du signalement, gains potentiels
- **Action**: Saisie du code de 4 chiffres
- **Processus**: Validation code → Confirmation remise → Versement gains
- **URL**: `/recuperation.html?id=DOC_ID&view=finder`

## 📊 Flux de Données

```
1. Document déclaré (LOST/FOUND)
        ↓
2. Matching automatique (score ≥80)
        ↓
3. Création claim + génération code
        ↓
4. Notification propriétaire
        ↓
5. Paiement propriétaire (5000 FCFA)
        ↓
6. Révélation code vérification
        ↓
7. Validation code par trouveur
        ↓
8. Remise document + versement gains
```

## 🔧 Points d'Intégration

### Backend
- **MatchingService**: Crée automatiquement les claims lors du matching
- **ClaimController**: Gère la validation des codes
- **PaymentController**: Traite les paiements et révèle les codes

### Frontend
- **recovery.js**: Service centralisé pour tous les appels API
- **recoveryService**: Objet global exposé pour les pages HTML
- **Mises à jour UI**: Automatiques selon les réponses API

## 🚀 Utilisation

### Pour le propriétaire:
```javascript
// Dans recuperer.html
const result = await window.recoveryService.completeOwnerWorkflow(docId);
if (result.success) {
  // UI mise à jour automatiquement
  // Code affiché: result.verificationCode
}
```

### Pour le trouveur:
```javascript
// Dans recuperation.html  
const result = await window.recoveryService.validateCode(docId, code);
if (result.success) {
  // Gains versés, redirection dashboard
}
```

## 🔐 Sécurité

- **Codes**: 6 chiffres générés aléatoirement
- **Limitation**: 5 tentatives maximum par claim
- **Validation**: Codes vérifiés côté serveur uniquement
- **Transactions**: Suivi complet avec statuts

## 📱 UX Features

- **Progression**: Timeline visuelle du processus
- **Notifications**: Messages en temps réel
- **Responsive**: Design mobile-first
- **Animations**: Transitions fluides entre étapes
- **Feedback**: Chargement et erreurs gérés

## 🐛 Débogage

### Logs Backend:
```bash
# Matching
🔐 [Claim] Auto-generated claim for document DOC_ID with code 123456

# Paiement  
💳 [Payment] Transaction TRANS_ID initiated for doc DOC_ID

# Validation
✅ [Recovery] Code validated successfully
```

### Logs Frontend:
```javascript
console.log('🔄 [Recovery] Starting complete owner workflow for:', docId);
console.log('✅ [Recovery] Payment successful, verification code:', code);
```

## 🔄 Tests

### Workflow complet:
1. Créer déclaration LOST et FOUND avec mêmes identifiants
2. Vérifier création automatique du claim
3. Payer depuis interface propriétaire
4. Valider code depuis interface trouveur
5. Confirmer mise à jour des statuts

### Cas limites:
- Code invalide (5 tentatives max)
- Claim inexistant
- Erreur paiement
- Document déjà retourné

---

**Note**: Cette intégration garantit que tous les appels API passent par `api.js`, assurant une maintenance centralisée et une cohérence des données.
