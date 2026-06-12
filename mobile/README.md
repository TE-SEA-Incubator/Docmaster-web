# Docmaster Mobile

Application mobile **offline-first** de Docmaster, construite avec **Expo (SDK 51)**, **Expo Router**, **NativeWind v4** et **TanStack Query**.

## Stack

| Domaine | Choix |
| --- | --- |
| Framework | Expo + TypeScript (strict) |
| Navigation | Expo Router (file-based, dossier `app/`) |
| Styling | NativeWind v4 (Tailwind CSS pour RN) |
| Données / cache / offline | TanStack Query v5 + `@react-native-community/netinfo` |
| Persistance cache | `@tanstack/query-async-storage-persister` + AsyncStorage |
| Sécurité | `expo-secure-store` (JWT chiffré) |
| Hardware | `expo-camera`, `expo-document-picker`, `expo-haptics` |
| Listes | `@shopify/flash-list` |

## Démarrage

```bash
cd mobile
npm install
npx expo start          # puis i (iOS) / a (Android)
```

L'URL de l'API se configure via `EXPO_PUBLIC_API_URL` (voir `.env.example`) ou
`expo.extra.apiBaseUrl` dans `app.json`. Valeur par défaut : `https://api-v2.docmaster.net/api`.

## Architecture

```
mobile/
├─ app/                      # Routes (Expo Router)
│  ├─ _layout.tsx            # Providers + protection des routes + bannière offline
│  ├─ index.tsx             # Splash/redirection selon la session
│  ├─ (auth)/                # Groupe non authentifié (login, register)
│  ├─ (tabs)/                # Groupe authentifié (accueil, documents, recherche, profil)
│  └─ modals/                # Écrans modaux (création de document)
└─ src/
   ├─ api/                   # Client Axios + endpoints
   ├─ services/              # Appels API par domaine (auth, documents)
   ├─ context/               # AuthContext (SecureStore)
   ├─ lib/                   # queryClient, onlineManager, offlineQueue, secureStore
   ├─ hooks/                 # useOfflineMutation, useDocuments, useNetworkStatus
   ├─ components/ui/         # Design system (Button, Input, Card, Badge, Typography)
   ├─ theme/                 # Palette de couleurs (mirroir du web)
   └─ types/                 # Types du contrat API
```

## Offline-first

1. **Lecture** : le cache React Query est persisté dans AsyncStorage
   (`networkMode: "offlineFirst"`), donc les données restent lisibles sans réseau.
2. **Écriture** : `useOfflineMutation` détecte l'absence de réseau, met la mutation
   en file d'attente (`src/lib/offlineQueue.ts`) et applique une mise à jour
   optimiste — l'UI affiche « En attente de connexion » au lieu d'une erreur.
3. **Synchronisation** : `onlineManager` (NetInfo) vide automatiquement la file
   dès le retour d'une connexion internet stable.
