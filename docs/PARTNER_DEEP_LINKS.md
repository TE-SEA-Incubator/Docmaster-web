# Deep links — App Partenaire (web + mobile)

Guide de configuration et de test des liens partenaire DocMaster.

## Variables d'environnement (backend)

Ajouter dans `Docmaster-web/server/.env` :

```env
FRONTEND_URL=https://docmaster.net

# Scheme custom de l'app Flutter partenaire (Phase 1)
PARTNER_APP_SCHEME=docmaster-partner

# Lien APK / TestFlight tant que l'app n'est pas en store (optionnel)
PARTNER_APP_DOWNLOAD_URL=

# Phase 2 — App Links / Universal Links (publication store)
PARTNER_ANDROID_PACKAGE=com.docmaster.docmaster_partner
PARTNER_IOS_BUNDLE_ID=com.docmaster.docmasterPartner
```

## Liens générés

| Action | Web | App (custom scheme) |
|--------|-----|---------------------|
| Connexion | `{FRONTEND_URL}/partenaire/connexion` | `docmaster-partner://login` |
| Reset MDP | `{FRONTEND_URL}/partenaire/reinitialisation?token=…` | `docmaster-partner://reset-password?token=…` |
| MDP oublié | `{FRONTEND_URL}/partenaire/mot-de-passe-oublie` | `docmaster-partner://forgot-password` |
| Changement MDP | `{FRONTEND_URL}/partenaire/changement-mot-de-passe` | `docmaster-partner://change-password` |
| Remise doc | `{FRONTEND_URL}/partenaire/rendre?id=…` | `docmaster-partner://rendre?id=…` |

Les emails d'invitation et de reset partenaire incluent **deux boutons** (web + app). Le SMS d'invitation contient les deux URLs.

Code source : `Docmaster-web/server/src/utils/partnerLinks.ts`

## Phase 1 — Custom scheme (APK / TestFlight)

Fonctionne immédiatement sans publication store.

### Android — tests ADB

```bash
# Connexion
adb shell am start -a android.intent.action.VIEW -d "docmaster-partner://login"

# Reset mot de passe
adb shell am start -a android.intent.action.VIEW -d "docmaster-partner://reset-password?token=TEST_TOKEN"
```

### iOS — tests

Coller dans Notes ou Safari :

```
docmaster-partner://login
docmaster-partner://reset-password?token=TEST_TOKEN
```

## Phase 2 — App Links HTTPS (publication store)

Fichiers à servir sur `https://docmaster.net` **sans redirection SPA** :

- `public/.well-known/assetlinks.json`
- `public/.well-known/apple-app-site-association`

### Android — SHA-256 release

```bash
keytool -list -v -keystore /path/to/release.keystore -alias your_alias | grep SHA256
```

Remplacer `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT` dans `assetlinks.json`.

### iOS — Team ID

Remplacer `TEAMID` dans `apple-app-site-association` par votre Apple Team ID  
(format : `ABCDE12345.com.docmaster.docmasterPartner`).

Activer la capability **Associated Domains** dans Xcode (`applinks:docmaster.net`) — fichier `ios/Runner/Runner.entitlements`.

### Vérification nginx

```nginx
location /.well-known/ {
    try_files $uri =404;
}
```

Les URLs HTTPS `/partenaire/*` ouvriront l'app si installée, sinon le portail web.

## Fichiers modifiés

| Zone | Fichiers |
|------|----------|
| Backend | `server/src/utils/partnerLinks.ts`, `mail.service.ts`, `partenaires.service.ts` |
| Flutter | `lib/core/deep_link/*`, `lib/app.dart`, `pubspec.yaml` |
| Android | `android/app/src/main/AndroidManifest.xml` |
| iOS | `ios/Runner/Info.plist`, `ios/Runner/Runner.entitlements` |
| Web static | `Docmaster-web/public/.well-known/*` |
