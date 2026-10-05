# Docmaster — Design System & Agent Rules

## Stack
- React + TypeScript + Vite
- Tailwind CSS (custom theme in `tailwind.config.js`)
- Mantine UI (components)
- Ant Design (legacy components, avoid for new work)
- FontAwesome (icons via `fa-solid fa-...`)
- React Router v6
- i18n via `useI18n()` hook

---

## Couleurs principales (tailwind.config.js)

```
primary:       #F5A64B  (orange)
primary-dark:  #E8923A
primary-light: #FEF3E2
green-dark:    #2D5A42
green-mid:     #3D7A5A
green-light:   #EAF4EE
bgMain:        #F4EFE6  (fond général)
surface:       #FFFFFF
surface2:      #FAF7F2
textMain:      #1A1A1A
textMuted:     #6B7280
borderMain:    #EAE3D8
```

---

## ❌ Ce qu'il NE FAUT PAS faire

### 1. Pas de cartes avec fond coloré sur les icônes
```tsx
// ❌ INTERDIT — fond coloré sur une icône
<div className="w-8 h-8 rounded-lg bg-green-light flex items-center justify-center">
  <i className="fa-solid fa-key text-green-dark" />
</div>

// ❌ INTERDIT — bg-red-100, bg-primary-light, bg-blue-50 autour d'une icône
<div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
  <i className="fa-solid fa-trash text-red-500" />
</div>
```

### 2. Pas de dégradés
```tsx
// ❌ INTERDIT
<div className="bg-gradient-to-r from-green-dark to-green-mid" />
gradient={{ from: "green.9", to: "green.6" }}
```

### 3. Pas de bordures colorées différentes de `borderMain`
```tsx
// ❌ INTERDIT — border avec couleur personnalisée sur une card ou bouton
<div style={{ border: "1px solid #FECACA" }} />
<div className="border-2 border-green-500" />
<Paper style={{ border: "1px solid red" }} />
```

### 4. Pas de boutons avec `variant="gradient"` ou couleurs vives sur les backgrounds
```tsx
// ❌ INTERDIT
<Avatar variant="gradient" gradient={{ from: "green.9", to: "green.6" }} />
```

---

## ✅ Ce qu'il FAUT faire

### Icônes — juste l'icône, sans fond
```tsx
// ✅ Icône seule avec couleur
<i className="fa-solid fa-key text-green-dark text-sm" />
<i className="fa-solid fa-shield-halved text-textMuted" />
```

### Cards — fond blanc, bordure neutre
```tsx
// ✅ Card standard
<Paper radius="xl" withBorder p="lg">
  ...
</Paper>

// ✅ Section dans une card — séparée par un divider, pas par une couleur de fond
<div style={{ borderTop: "1px solid var(--mantine-color-default-border)", paddingTop: "1.5rem" }}>
```

### Boutons — couleurs sobres
```tsx
// ✅ Bouton primaire (vert sombre)
<Button radius="xl" size="sm" style={{ backgroundColor: "#1E3A2F" }}>
  Sauvegarder
</Button>

// ✅ Bouton secondaire
<Button radius="xl" size="sm" variant="default">
  Annuler
</Button>

// ✅ Bouton danger — light seulement, pas filled
<Button color="red" variant="light" radius="xl" size="sm">
  Supprimer
</Button>

// ✅ Bouton success
<Button color="green" radius="xl" size="sm">
  Confirmer
</Button>
```

### Badges — light seulement
```tsx
// ✅ 
<Badge color="green" variant="light" radius="xl" size="sm">Actif</Badge>
<Badge color="gray" variant="light" radius="xl" size="sm">Standard</Badge>
<Badge color="orange" variant="light" radius="xl" size="sm">Incomplet</Badge>
```

### Sections avec titre
```tsx
// ✅ Titre de section — texte en uppercase dimmed, pas de fond
<Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="sm" style={{ letterSpacing: "0.05em" }}>
  Identité
</Text>
```

### Alerts — toujours `variant="light"`
```tsx
// ✅
<Alert color="green" variant="light" radius="md">...</Alert>
<Alert color="red" variant="light" radius="md">...</Alert>
```

---

## Layout global

- **Sidebar** : composant global dans `Layout.tsx`, ne pas re-importer dans les pages
- **Topbar** : composant global dans `Layout.tsx`, chaque page appelle `useTopbar(title, breadcrumbs)` 
- **Pages auth** : `flex-1 overflow-y-auto bg-bgMain` + padding `px-4 sm:px-6 py-6`
- **Pages fullscreen** (ex: Messagerie) : `flex flex-col flex-1 overflow-hidden`
- Pas de `max-w-*` sauf si explicitement demandé

## Architecture

- `src/pages/auth/` — pages utilisateur connecté
- `src/pages/admin/` — pages admin
- `src/layout/Layout.tsx` — layout principal avec Sidebar + Topbar globaux
- `src/context/TopbarContext.tsx` — contexte pour le titre du Topbar
- `src/hooks/useTopbar.ts` — hook pour définir titre/breadcrumbs depuis une page
- `src/theme/` — thème Mantine et partenaires
