---
name: flat-admin-ui
description: Génère des interfaces admin/dashboard dans le style "Flat Admin UI" — propre, plat, sans effets décoratifs, orienté productivité. Utilise ce skill quand l'utilisateur demande une page de paramètres, un dashboard admin, un panneau de configuration, un formulaire d'administration, ou toute interface back-office. Déclenche aussi si l'utilisateur mentionne des mots comme "propre", "sobre", "pas de fioriture", "redesign admin", "settings page", "panneau admin", ou demande à "nettoyer" un design existant trop chargé (gradients, glassmorphism, neumorphism). Utilise ce skill même si l'utilisateur ne mentionne pas explicitement un style.
---

# Flat Admin UI

Style d'interface admin sobre, plat et orienté productivité. Inspiré de Linear, Vercel Dashboard, Notion, Raycast.

## Principe fondamental

**Aucun effet décoratif.** Pas de gradient, pas d'ombre portée, pas de blur, pas de rotation, pas d'animation tape-à-l'œil. La hiérarchie vient de la typographie et de l'espacement, pas des effets visuels.

Ce style est fait pour des utilisateurs qui **travaillent dedans tous les jours**. La lisibilité et l'efficacité priment sur le "wow effect".

---

## Palette de couleurs

Utilise une couleur d'accent principale + des neutres. Les couleurs sémantiques servent uniquement à encoder du sens (succès, danger, info).

### Neutres (base)
```css
--gray-50:  #f9fafb;   /* fond des inputs, cards secondaires */
--gray-100: #f3f4f6;   /* hover states */
--gray-200: #e5e7eb;   /* bordures principales */
--gray-400: #9ca3af;   /* texte secondaire, labels */
--gray-600: #6b7280;   /* texte muted */
--gray-900: #111827;   /* texte principal */
```

### Couleurs sémantiques (icon-wraps & accents)
| Rôle | Fond | Texte/Icône | Usage |
|------|------|-------------|-------|
| Général / neutre | `#EAF3DE` | `#3B6D11` | Sections génériques |
| Info / données | `#E6F1FB` | `#185FA5` | Commissions, stats |
| Avertissement | `#FAEEDA` | `#BA7517` | SaaS, configurations importantes |
| Premium / action | `#EEEDFE` | `#534AB7` | Plans, abonnements |
| Danger | `#FAECE7` | `#993C1D` | Maintenance, suppressions |

### Couleur d'action principale
```css
--accent:       #639922;   /* vert sobre — boutons primaires, focus rings */
--accent-dark:  #3B6D11;   /* hover */
--accent-light: #EAF3DE;   /* backgrounds légers */
```

---

## Typographie

- `font-size: 1.5rem; font-weight: 600` — Titre de page (h1)
- `font-size: 0.9375rem; font-weight: 500` — Titre de section
- `font-size: 0.875rem; font-weight: 400` — Corps de texte, labels inputs
- `font-size: 0.8125rem; font-weight: 400` — Texte secondaire dans les rows
- `font-size: 0.75rem; font-weight: 400` — Labels de champs (au-dessus des inputs)
- `font-size: 0.6875rem; font-weight: 400` — Labels uppercase dans les plan-cards
- `font-size: 0.625rem; font-weight: 500` — Tags/badges (plan-id, popular)

**Règles :**
- Jamais `font-weight: 700` ou plus — trop lourd contre les surfaces blanches
- Jamais `ALL CAPS` sauf pour les micro-tags (`letter-spacing: 0.04em`)
- Couleur texte principal : `#111` ou `var(--color-text-primary)`
- Couleur texte secondaire : `#6b7280` ou `#9ca3af`

---

## Composants

### Section card
Conteneur de base pour chaque bloc de paramètres.

```html
<div class="section">
  <div class="section-header">
    <div class="icon-wrap icon-green">
      <!-- Heroicon 16x16 -->
    </div>
    <div>
      <h2 class="section-title">Titre</h2>
      <p class="section-sub">Sous-titre court</p>
    </div>
  </div>
  <!-- contenu -->
</div>
```

```css
.section {
  background: #fff;
  border: 0.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.25rem;
}
.icon-wrap {
  width: 34px; height: 34px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ico { width: 16px; height: 16px; }
```

### Champ texte / input
```css
.field label {
  font-size: 0.75rem;
  color: #6b7280;
  display: block;
  margin-bottom: 5px;
}
.field input {
  background: #f9fafb;
  border: 0.5px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.875rem;
  color: #111;
  width: 100%;
}
.field input:focus {
  outline: none;
  border-color: #639922;
  box-shadow: 0 0 0 3px rgba(99,153,34,0.12);
}
```

### Toggle (switch on/off)
Pas de librairie externe. CSS pur.

```html
<button class="toggle toggle-on" @click="val = !val">
  <span class="toggle-thumb"></span>
</button>
```

```css
.toggle {
  width: 40px; height: 22px;
  border-radius: 999px;
  border: none; cursor: pointer;
  position: relative; padding: 0;
  transition: background 0.2s;
}
.toggle-on  { background: #639922; }
.toggle-off { background: #d1d5db; }
.toggle-thumb {
  position: absolute; top: 3px;
  width: 16px; height: 16px;
  background: white; border-radius: 50%;
  transition: left 0.2s; display: block;
}
.toggle-on  .toggle-thumb { left: 21px; }
.toggle-off .toggle-thumb { left: 3px; }
```

### Toggle row (ligne avec label + toggle)
```css
.toggle-row {
  display: flex; align-items: center;
  justify-content: space-between; gap: 1rem;
  padding: 12px 14px;
  background: #f9fafb;
  border: 0.5px solid #e5e7eb;
  border-radius: 8px;
}
.toggle-label p  { font-size: 0.8125rem; font-weight: 500; color: #111; }
.toggle-label span { font-size: 0.6875rem; color: #9ca3af; }
```

### Plan cards (grille de forfaits)
```css
.plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.plan-card {
  background: #f9fafb;
  border: 0.5px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
}
.plan-card.plan-popular {
  border-color: #639922;
  border-width: 1.5px;  /* seule exception au 0.5px — pour accentuer */
}
.plan-id-tag {
  font-size: 0.625rem; font-weight: 500;
  padding: 2px 8px; border-radius: 999px;
  background: #e5e7eb; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.plan-popular-tag {
  background: #EAF3DE; color: #3B6D11;
  /* mêmes dimensions que plan-id-tag */
}
```

### Bouton primaire
```css
.btn-save {
  background: #639922;
  color: #fff;
  border: none; border-radius: 8px;
  padding: 9px 22px;
  font-size: 0.875rem; font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-save:hover    { background: #3B6D11; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
```

### Bouton danger / maintenance
```css
.btn-danger {
  font-size: 0.8125rem; font-weight: 500;
  padding: 8px 16px; border-radius: 8px;
  border: 0.5px solid #d1d5db;
  background: #f9fafb; color: #374151;
  cursor: pointer; transition: all 0.15s;
}
.btn-danger.active {
  background: #FAECE7;
  color: #993C1D;
  border-color: #F0997B;
}
```

### Indicateur de statut (point coloré)
```css
.status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #d1d5db;
}
.status-dot.active {
  background: #D85A30;
  box-shadow: 0 0 0 3px rgba(216,90,48,0.2);
}
```

### Spinner de chargement
```css
.spinner {
  width: 28px; height: 28px;
  border: 2px solid #e5e7eb;
  border-top-color: #639922;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

---

## Layout général

```css
.settings-page {
  padding: 2rem 0;
  max-width: 860px;
}
.page-header { margin-bottom: 2rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 600; color: #111; }
.page-header p  { font-size: 0.875rem; color: #6b7280; margin-top: 2px; }

.sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;         /* gap entre les sections */
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 600px) {
  .grid-2, .plan-grid { grid-template-columns: 1fr; }
}
```

---

## Règles absolues — NE JAMAIS faire

| Interdit | Alternative |
|----------|-------------|
| `gradient`, `linear-gradient`, `radial-gradient` | Fond plat `#f9fafb` |
| `box-shadow` décorative | Bordures `0.5px solid` |
| `backdrop-filter: blur()` | Fond opaque |
| `border-radius` > `16px` | Max `border-radius: 12px` |
| `font-weight: 700` ou `800` | Max `font-weight: 500` |
| `ALL CAPS` sur du texte courant | `lowercase` ou `sentence case` |
| Animations `rotate`, `translate` sur des conteneurs | Réservé aux micro-transitions d'état |
| `border-width > 1.5px` | `0.5px` par défaut, `1.5px` uniquement pour accentuer un plan "populaire" |
| Couleurs arbitraires hors palette | Utiliser la palette définie |
| Emojis décoratifs dans l'UI | Heroicons 16px |

---

## Loader global (overlay d'action)

Pour les actions longues (ex: toggle maintenance), utiliser un overlay sobre :

```css
.global-loader {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(8px);   /* seul cas autorisé */
  display: flex; align-items: center; justify-content: center;
}
.loader-inner {
  display: flex; flex-direction: column;
  align-items: center; gap: 12px; text-align: center;
}
.loader-inner h3 { font-size: 1.125rem; font-weight: 600; color: #111; }
.loader-inner p  { font-size: 0.875rem; color: #6b7280; max-width: 280px; }
```

Le spinner utilise `border-top-color: #D85A30` (rouge corail) pour les actions de danger.

---

## Checklist avant de livrer

- [ ] Aucun gradient dans le code
- [ ] Toutes les bordures à `0.5px` (sauf carte populaire à `1.5px`)
- [ ] `border-radius` ≤ `12px` partout
- [ ] Texte principal `#111`, texte secondaire `#6b7280` ou `#9ca3af`
- [ ] Icônes via Heroicons `24/outline`, forcées à `16px × 16px`
- [ ] Focus rings sur tous les inputs (`box-shadow: 0 0 0 3px rgba(...)`)
- [ ] Responsive : grilles passent en `1fr` sous 600px
- [ ] Loader global ne bloque pas le scroll (utiliser `position: fixed`)
- [ ] Bouton save désactivé pendant `updating === true`