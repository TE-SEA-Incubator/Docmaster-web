# DocMaster - Gestion de Documents Perdus & Trouvés

DocMaster est une plateforme innovante permettant de centraliser les déclarations de documents perdus ou retrouvés, tout en récompensant les citoyens honnêtes et en facilitant la récupération sécurisée.

## 📋 Table des Matières
- [Acteurs & Rôles](#acteurs--rôles)
- [Flux de Travail (Use Cases)](#flux-de-travail-use-cases)
- [Système de Récompenses & Points](#système-de-récompenses--points)
- [Gestion Financière (Wallet)](#gestion-financière-wallet)
- [Matching Intelligent](#matching-intelligent)

---

## 👥 Acteurs & Rôles

1. **Le Perdeur (Propriétaire)** : Déclare ses documents perdus, recherche dans la base et paie les frais de récupération.
2. **Le Trouveur (Finder)** : Déclare les documents ramassés, effectue les mises en relation (matching) et reçoit une récompense.
3. **L'Administrateur** : Supervise les transactions, valide les types de documents et gère les paramètres globaux.

---

## 🚀 Flux de Travail (Use Cases)

### 1. Déclaration de Perte
- **Action** : L'utilisateur publie une annonce pour un document égaré.
- **Technique** : Création d'une entrée `LOST` dans la table `declarations`.
- **Récompense** : +5 points de fidélité.

### 2. Déclaration de Trouvaille
- **Action** : Un citoyen déclare avoir trouvé un document.
- **Technique** : Création d'une entrée `FOUND` dans la table `declarations`.
- **Récompense** : +5 points de fidélité.

### 3. Le Processus de Récupération (Claim)
1. **Paiement** : Le propriétaire paie les frais de retrouvaille via Mobile Money (Nokash).
2. **Code de Vérification** : Un code unique à 6 chiffres est généré pour le propriétaire.
3. **Récompense Finder** : Le portefeuille (Wallet) du trouveur est automatiquement crédité de sa commission (ex: 80% du prix).
4. **Validation Finale** : Le propriétaire remet le code au trouveur lors de la rencontre physique. Le trouveur saisit le code pour clore le dossier.

---

## 💎 Système de Récompenses & Points

Le score de fidélité est calculé dynamiquement et synchronisé avec la base de données à chaque consultation du profil.

| Action | Points Gagnés |
| :--- | :--- |
| Publication d'une annonce | 5 pts |
| Remise réussie d'un document | Selon le type (ex: 10-20 pts) |
| Parrainage validé | 10 pts |

### Niveaux de Fidélité
- **Argent** : Moins de 500 points.
- **Or** : 500 points et plus (débloque des avantages exclusifs).

---

## 💰 Gestion Financière (Wallet)

DocMaster intègre un système de portefeuille virtuel pour les trouveurs :
- **Entrées** : Commissions sur les documents rendus, bonus de parrainage (500 XAF).
- **Sorties** : Retraits vers Mobile Money (Cameroun : MTN/Orange).
- **Historique** : Chaque mouvement d'argent génère une transaction de type `finder_payout`, `referral_reward` ou `withdrawal`.

---

## 🔍 Matching Intelligent

Le système effectue des comparaisons automatiques basées sur :
- **Le numéro de document** (ex: Numéro CNI).
- **Le fingerprint** (Empreinte numérique des données du document).
- **Le type et le nom** du propriétaire.

Dès qu'une correspondance est trouvée, les deux parties reçoivent une notification instantanée.

---

## 🛠️ Stack Technique
- **Frontend** : HTML5, Vanilla CSS, JavaScript (Vite).
- **Backend** : Node.js, Express, TypeScript.
- **Base de données** : PostgreSQL.
- **Notifications** : Système interne + Email (Nodemailer).
- **Paiements** : Nokash API.

---
*Développé avec ❤️ pour faciliter la vie des citoyens.*