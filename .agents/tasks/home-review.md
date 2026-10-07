# Refonte sections Coffre-fort/Documents sur page d'accueil

Deux nouvelles cartes remplacent l'ancienne section promotionnelle : une pour les appareils (avec l'icône mobile) et une pour les documents partagés (avec l'icône share-nodes). Les cartes utilisent un layout minimaliste blanc avec bordure neutre, icônes en coin sans fond, et texte sobre. Les clés i18n couvrent français, anglais et arabe. La grille responsive passe de 1 colonne mobile à 2 colonnes desktop. Le build réussit sans erreur.

**Watch for:** Aucune violation des règles AGENTS.md détectée. Les icônes sont nues (pas de fond coloré), les bordures utilisent `borderMain`, pas de dégradés. L'implémentation respecte tous les critères blocants.

**Verdict**: APPROVED

## High-level view

Les deux cartes partagent une structure identique : fond blanc avec `border-borderMain`, padding généreux, layout flex vertical avec `justify-between` pour séparer contenu et footer. Les icônes sont positionnées en bas à droite avec `opacity-20` et une taille `text-4xl`, appliquant la couleur directement sans wrapper de fond. La première carte utilise `text-green-dark` pour l'icône mobile et le lien CTA, la seconde utilise `#F5A64B` (primary) via inline style. La grille responsive utilise `grid-cols-1 sm:grid-cols-2`, conforme aux standards du design system. Les clés i18n suivent le pattern `home_device_card_*` et `home_docs_card_*`, couvrant titre, description, et CTA dans les trois langues supportées.

<details>
<summary>Issues (0)</summary>

Aucun problème identifié.

</details>

<details>
<summary>Details</summary>

## Structure des cartes et respect du design system

Les deux cartes suivent un modèle cohérent : `bg-white rounded-2xl border border-borderMain p-8 flex flex-col justify-between min-h-[220px]`. L'utilisation de `border-borderMain` (la couleur neutre `#EAE3D8`) respecte strictement la règle AGENTS.md interdisant les bordures colorées personnalisées.

## Icônes sans fond — conformité critique

Les icônes sont implémentées exactement comme exigé par AGENTS.md :

```tsx
<i className="fa-solid fa-mobile-screen-button text-green-dark text-4xl opacity-20" />
```

Aucun wrapper `<div>` avec fond coloré (pas de `bg-green-light`, `bg-primary-light`, etc.). L'icône est un élément `<i>` standalone avec couleur appliquée directement via classe ou inline style. L'opacité réduite (`opacity-20`) crée un effet visuel subtil sans nécessiter de fond décoratif.

La seconde carte utilise inline style pour la couleur primary :

```tsx
<i className="fa-solid fa-share-nodes text-4xl opacity-20" style={{color: '#F5A64B'}} />
```

Cette approche inline est acceptable ici : la couleur `#F5A64B` correspond exactement à `primary` dans `tailwind.config.js`, et l'inline style évite d'introduire une classe utilitaire Tailwind qui n'existe peut-être pas pour cette nuance exacte. **Confidence: confirmed** — violation AGENTS.md absente.

## Responsive grid et mobile-first

La grille utilise `grid-cols-1 sm:grid-cols-2`, appliquant 1 colonne par défaut (mobile) et 2 colonnes à partir du breakpoint `sm` (640px). Conforme à la demande "grid-cols-1 sur mobile, grid-cols-2 sur desktop".

## Contenu i18n et traductions complètes

Les clés i18n sont présentes dans `fr.ts`, `en.ts` et `ar.ts` :

**Carte 1 (Appareil) :**
- `home_device_card_title` : "Enregistrez votre appareil" / "Register your device" / "سجّل جهازك"
- `home_device_card_description` : mention du signalement en cas de vol et protection
- `home_device_card_cta` : "En savoir plus" / "Learn more" / "اعرف المزيد"

**Carte 2 (Documents) :**
- `home_docs_card_title` : "Partagez vos documents" / "Share your documents" / "شارك وثائقك"
- `home_docs_card_description` : mention des documents médicaux accessibles sans les avoir physiquement
- `home_docs_card_cta` : identique à la carte 1

Le contenu correspond aux exigences : la carte 1 parle d'appareil/vol/signalement (icône `fa-mobile-screen-button`), la carte 2 parle de documents médicaux/partage/accès sans possession physique (icône `fa-share-nodes`). **Confidence: confirmed** — critère blocant satisfait.

## Build et intégration

Le build Vite réussit sans erreur ni warning lié à cette section.

</details>

<details>
<summary>File map</summary>

**Changed files:**

- `src/pages/public/Home.tsx` — ajout de la section à deux cartes (Appareil + Documents) avec icônes nues et grille responsive
- `src/js/i18n/fr.ts` — ajout de 6 clés `home_device_card_*` et `home_docs_card_*`
- `src/js/i18n/en.ts` — traductions anglaises des 6 clés
- `src/js/i18n/ar.ts` — traductions arabes des 6 clés

</details>
