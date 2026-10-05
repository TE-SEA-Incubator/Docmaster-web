# Système de Retrait pour Partenaires

## Vue d'ensemble

Le système de retrait permet aux organisations partenaires de retirer leur solde disponible vers leur compte Mobile Money (MTN MoMo ou Orange Money). Cette fonctionnalité est maintenant disponible dans le portail partenaire web.

## Fonctionnalités

### Pour les Partenaires

1. **Demander un retrait**
   - Montant minimum configurable (par défaut 1000 FCFA)
   - Sélection de la méthode (MTN MoMo ou Orange Money)
   - Le solde est débité immédiatement
   - Détection automatique de l'opérateur selon le préfixe du numéro

2. **Historique des retraits**
   - Voir toutes les demandes de retrait
   - Statuts : EN_ATTENTE, EN_COURS, COMPLÉTÉ, REJETÉ
   - Notes de l'administrateur visibles

### Pour les Administrateurs

Les administrateurs peuvent gérer les retraits partenaires via l'interface admin existante (`/admin/withdrawals`). Les retraits des partenaires sont différenciés par le champ `source_type = 'PARTENAIRE'`.

## Architecture Technique

### Base de données

**Migration 67** : `67_add_source_type_to_withdrawals.sql`
- Ajoute la colonne `source_type` à la table `withdrawals`
- Valeurs possibles : `'USER'` (utilisateur normal) ou `'PARTENAIRE'` (organisation)
- Indexes pour optimiser les requêtes

### Backend

**Routes ajoutées** : `/api/partenaires/withdrawals`
- `POST /request` - Demander un retrait (authentifié)
- `GET /` - Historique des retraits (authentifié)

**Contrôleur** : `PartenaireController`
- `requestWithdrawal()` - Gère la demande de retrait
- `getWithdrawals()` - Récupère l'historique

**Service** : `PartenaireService`
- Validation du solde
- Débit immédiat du portefeuille
- Création de la demande de retrait
- Traçabilité dans `partenaire_wallet_transactions`

### Frontend

**Page** : `/src/pages/partenaires/Retraits.tsx`
- Affichage du solde disponible
- Formulaire de demande de retrait
- Tableau d'historique avec filtres

**Navigation** : Ajout de l'entrée "Retraits" dans le menu latéral

## Installation et Déploiement

### 1. Appliquer la migration

```bash
cd server
npx tsx apply_withdrawal_migration.ts
```

Ou manuellement :
```bash
psql -d docmaster -f server/src/database/shema/67_add_source_type_to_withdrawals.sql
```

### 2. Redémarrer le serveur

```bash
cd server
npm run dev  # développement
# ou
npm run build && npm start  # production
```

### 3. Redémarrer le frontend

```bash
npm run dev  # développement
# ou
npm run build  # production
```

## Configuration

### Montant minimum de retrait

Le montant minimum est configurable via la table `app_settings` :

```sql
INSERT INTO app_settings (key, value, description)
VALUES ('min_withdrawal_amount', '1000', 'Montant minimum de retrait en FCFA')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Méthodes de paiement supportées

- **MTN Mobile Money** : Préfixes 67, 68
- **Orange Money** : Préfixes 65, 69

## Workflow de retrait

1. **Partenaire demande un retrait**
   - Vérifie que le solde est suffisant
   - Vérifie que le montant >= minimum
   - Débite le portefeuille immédiatement
   - Crée une entrée dans `withdrawals` avec statut `PENDING`
   - Envoie une notification aux admins

2. **Admin traite la demande**
   - Voit la demande dans `/admin/withdrawals`
   - Peut approuver → lance le paiement NoKash automatiquement
   - Peut rejeter → rembourse automatiquement le partenaire

3. **Intégration NoKash Payout**
   - Paiement automatique vers Mobile Money
   - Webhook de confirmation
   - Mise à jour du statut (`COMPLETED` ou `REJECTED`)

## Tests

### Test manuel

1. Se connecter en tant que partenaire
2. Aller dans "Retraits"
3. Demander un retrait de 1000 FCFA
4. Vérifier que le solde est débité
5. Vérifier l'historique

### Test d'intégration

```bash
cd server
npm test -- --grep "withdrawal"
```

## Sécurité

- ✅ Authentification requise (JWT)
- ✅ Vérification du solde avant débit
- ✅ Transaction SQL atomique (BEGIN/COMMIT/ROLLBACK)
- ✅ Validation des numéros de téléphone
- ✅ Montant minimum configurable
- ✅ Traçabilité complète (wallet_transactions + activity_logs)

## Monitoring

Les retraits partenaires peuvent être monitorés via :

1. **Logs serveur** : Rechercher `[Partenaires]`
2. **Table `withdrawals`** : Filtrer par `source_type = 'PARTENAIRE'`
3. **Table `partenaire_wallet_transactions`** : Raison `WITHDRAWAL`
4. **Table `activity_logs`** : Action `WALLET_DEBIT`

## Support Mobile

### Application mobile partenaire

La même API peut être utilisée pour l'application mobile partenaire :

**Endpoints** :
```
POST /api/partenaires/withdrawals/request
GET /api/partenaires/withdrawals
```

**Headers requis** :
```
Authorization: Bearer <partner_jwt_token>
Content-Type: application/json
```

**Exemple de requête** :
```json
{
  "amount": 5000,
  "payment_method": "MTN_MOMO",
  "phone": "677000000"
}
```

## Dépannage

### Erreur : "Solde insuffisant"
- Vérifier le solde dans `partenaires.wallet_balance`
- Vérifier qu'il n'y a pas de retraits en attente

### Erreur : "Montant minimum"
- Vérifier la configuration `app_settings.min_withdrawal_amount`

### Migration échoue
- Vérifier que PostgreSQL >= 12
- Vérifier les permissions sur la base de données
- Rollback manuel si nécessaire

## Roadmap

- [ ] Support des virements bancaires
- [ ] Retraits programmés (automatiques)
- [ ] Notifications push pour les partenaires
- [ ] Export PDF des retraits
- [ ] Dashboard analytics des retraits
