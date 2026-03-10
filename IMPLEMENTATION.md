# Documentation d'Implémentation - DocMaster

Ce document détaille les changements structurels, esthétiques et fonctionnels apportés au projet DocMaster.

## 1. Restructuration des Dossiers

Le projet a été organisé pour séparer les responsabilités :

- `/src/css/` : Contient `main.css` et `rechercher.css`.
- `/src/js/` : Contient `index.js`, `script.js`, `fillin.js` et le nouveau `auth.js`.
- `/src/assets/` : Dossier dédié aux images et icônes.

## 2. Système d'Authentification (`auth.js`)

Un système d'authentification par session a été mis en œuvre en utilisant le `localStorage` du navigateur.

### Fonctionnement technique :

- **Base de données simulée** : `docmaster_users_db` stocke les utilisateurs inscrits.
- **Gestion de session** : `docmaster_user_session` maintient l'utilisateur connecté même après rechargement de la page.
- **Redirections automatiques** :
  - Si un utilisateur non connecté tente d'accéder au `dashboard.html`, il est redirigé vers `login.html`.
  - Si un utilisateur connecté accède à `login.html`, il est redirigé vers `dashboard.html`.

### Intégration UI :

Le script synchronise automatiquement les éléments suivants avec les données de l'utilisateur connecté :

- Nom de l'utilisateur (`userName`, `topName`, `helloName`)
- Initiales pour l'avatar (`userInitial`, `topInitial`)

## 3. Nouveau Dashboard (`dashboard.html`)

Un tableau de bord complet a été ajouté pour offrir une vue d'ensemble des activités :

- **Quick Actions** : Boutons rapides pour signaler un document perdu ou trouvé.
- **Statistiques** : Visualisation du nombre de documents retrouvés et membres actifs.
- **Activités Récentes** : Liste des derniers signalements avec badges de statut (En cours, Retrouvé, Nouveau).
- **Plan d'Abonnement** : Barre de progression indiquant l'utilisation du quota de signalements.

## 4. Unification du Design

L'identité visuelle a été harmonisée sur toutes les pages (`index`, `login`, `rechercher`, `dashboard`) :

### Couleurs

- **Primaire** : Orange `#F5A64B` (Variable `--p` ou `--orange`).
- **Accent** : Vert Sombre `#1E3A2F` (Style Premium).

### Typographie

- **Titres & Logo** : `Bricolage Grotesque` pour un aspect moderne et audacieux.
- **Corps de texte** : `Poppins` pour une lisibilité maximale.

### Composants

- Utilisation de **Tailwind CSS** pour les mises en page responsive.
- Icônes uniformisées via **Font Awesome 6**.

## 5. Suppression de fichiers obsolètes

Les fichiers `object.html` et `document.html` ont été supprimés car leurs fonctionnalités ont été intégrées dans le nouveau système de dashboard et la page de recherche.

---

_Document généré le 9 Mars 2026 par DocMaster Engineering Team._
