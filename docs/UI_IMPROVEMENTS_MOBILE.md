# 🎨 Améliorations UI Mobile - Historique de Retrait

## Problèmes identifiés

Sur mobile, les modals de la page "Mes Gains" étaient :
- ❌ Trop petites (`size="sm"`)
- ❌ Contenus trop serrés
- ❌ Badges et textes trop petits
- ❌ Notes admin tronquées et illisibles
- ❌ Boutons d'action trop petits pour le tactile

## ✅ Améliorations appliquées

### 1. Modal "Withdrawal history" (Historique de retrait)

**Avant** :
- Modal petite avec contenu serré
- Badge minuscule
- Note admin tronquée à 120px
- Icône simple sans fond

**Après** :
- ✅ Modal plus large (`size="md"`)
- ✅ Padding généreux (24px horizontal, 16px vertical)
- ✅ Icône dans un cercle coloré (fond primary-light)
- ✅ Badge plus grand (`size="sm"`)
- ✅ Montant en grande police (text-lg, fw=700)
- ✅ Méthode de paiement + numéro affichés séparément
- ✅ Note admin dans un bloc distinct avec fond gris
- ✅ Séparateurs subtils entre éléments
- ✅ Header de modal avec bordure inférieure

**Layout amélioré** :
```
┌────────────────────────────────────┐
│  Withdrawal history           [×]  │ ← Header
├────────────────────────────────────┤
│                                    │
│  ⊙  25,00 XAF        [Pending]     │ ← Icône ronde + Badge
│     MTN MOMO · 237697407380        │ ← Méthode + Numéro
│     2 Nov 2026                     │ ← Date
│                                    │
│     ℹ️  Note admin en gris clair   │ ← Note si présente
│                                    │
├────────────────────────────────────┤
│  ⊙  100,00 XAF       [Approved]    │
│     ORANGE MONEY · 237650123456    │
│     1 Nov 2026                     │
└────────────────────────────────────┘
```

### 2. Modal "Withdrawal methods" (Méthodes sauvegardées)

**Avant** :
- Cartes compactes
- Boutons d'action minuscules (7x7px)
- Badge par défaut isolé
- Difficile de cliquer sur mobile

**Après** :
- ✅ Cards spacieuses avec padding 16px
- ✅ Icône dans carré arrondi (12x12) avec fond coloré
- ✅ Badge "Par défaut" avec icône étoile
- ✅ Boutons full-width avec labels explicites
- ✅ Bouton "Définir par défaut" visible avec texte
- ✅ Bouton "Supprimer" avec label sur méthodes par défaut
- ✅ Hover states clairs
- ✅ Espacement entre boutons

**Layout amélioré** :
```
┌────────────────────────────────────┐
│  Payment methods              [×]  │
├────────────────────────────────────┤
│                                    │
│ ┌────────────────────────────────┐ │
│ │  📱  MTN MOMO  ⭐ Par défaut   │ │
│ │     237697407380               │ │
│ │                                │ │
│ │ [Supprimer ────────────────]   │ │
│ └────────────────────────────────┘ │
│                                    │
│ ┌────────────────────────────────┐ │
│ │  📱  ORANGE MONEY              │ │
│ │     237650123456               │ │
│ │                                │ │
│ │ [⭐ Définir par défaut] [🗑️]   │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

## Design System appliqué

### Couleurs
- ✅ Fond icône : `bg-primary-light` (#FEF3E2)
- ✅ Icône couleur : `text-primary` (#F5A64B)
- ✅ Fond card : `bg-surface2` (#FAF7F2)
- ✅ Bordures : `border-borderMain` (#EAE3D8)
- ✅ Texte : `c="dark"` / `c="dimmed"`

### Espacements
- ✅ Padding modal body : 16px
- ✅ Padding header : 20px 24px
- ✅ Padding cards : 16px
- ✅ Gap entre éléments : 12-16px
- ✅ Border radius : 24px (modal), 16px (cards)

### Typographie
- ✅ Montant : text-lg (18px), fw=700
- ✅ Labels : text-sm, fw=700
- ✅ Détails : text-xs, c="dimmed"
- ✅ Badges : size="sm", variant="light"

### Icônes
- ✅ Taille dans cercle : text-sm (14px)
- ✅ Cercle : 40x40px (10 = 40px en Tailwind)
- ✅ Border radius cercle : rounded-full
- ✅ Pas de fond coloré directement sur l'icône (design system)

## Responsive

Les améliorations fonctionnent sur :
- ✅ Mobile portrait (375px+)
- ✅ Mobile landscape (667px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1024px+)

La modal `size="md"` s'adapte automatiquement sur petit écran.

## Accessibilité

- ✅ Labels explicites sur boutons ("Définir par défaut", "Supprimer")
- ✅ Titre de modal clair
- ✅ Contraste suffisant (WCAG AA)
- ✅ Zones tactiles ≥ 44x44px
- ✅ États hover/focus visibles

## Fichiers modifiés

- `src/pages/auth/MesGains.tsx`
  - `WithdrawalHistoryModal` → Layout amélioré
  - `SavedMethodsModal` → Boutons et cards améliorés

## Avant / Après

### Avant
- Modal étroite, contenu illisible
- Note admin tronquée
- Boutons minuscules
- Design serré et peu aéré

### Après
- Modal confortable
- Toutes les infos visibles
- Boutons tactiles généreux
- Design spacieux et professionnel

---

**Date** : 2026-11-02  
**Fichiers** : 1  
**Impact** : Mobile UX +++
