# Plan de refactoring — MesGains.tsx

## Analyse du fichier existant

Le fichier `src/pages/auth/MesGains.tsx` fait 1460 lignes et contient :
- Le composant page `MesGains` (logique fetch, états, handlers)
- 10 sous-composants définis dans le même fichier : `WalletCard`, `StatCard`, `PointsCard`, `PointsRow`, `PotentialEarningsCard`, `TransactionsCard`, `EarningsHistoryCard`, `PaymentMethodCard`, `WithdrawModal`, `WithdrawHistoryModal`, `SavedMethodsModal`, `AddPaymentMethodModal`, `ConvertPointsModal`
- 2 helpers purs : `getTxMeta`, `getEarningMeta`
- `TxStatusBadge`

Tout reste dans ce même fichier — on ne déplace rien, on refactorise uniquement la structure JSX du composant page et les violations design dans les sous-composants.

---

## 1. Sous-composants à modifier (violations AGENTS.md)

### 1.1 `StatCard` — PRIORITÉ HAUTE
Actuellement : fond coloré sur l'icône (`bg-green-light`, `bg-primary/10`, `bg-amber-50`, `bg-blue-50`)
```tsx
// AVANT — INTERDIT
<div className={`w-9 h-9 rounded-[10px] ${bg} flex items-center justify-center mb-3`}>
  <i className={`fa-solid ${icon} ${color} text-sm`} />
</div>
```
**Action :** Supprimer le `div` wrapper avec `bg`, garder seulement l'icône. Supprimer les props `bg` et `color` de l'appel depuis `MesGains` (remplacer par une seule prop `iconClass` ou conserver `icon` + `color` sans `bg`).
```tsx
// APRÈS — CONFORME
<i className={`fa-solid ${icon} ${color} text-xl mb-3`} />
```
Supprimer aussi le prop `bg` dans les 4 appels `<StatCard ... bg="..." />` dans `MesGains`.

### 1.2 `PointsCard` — fond coloré sur icône titre
```tsx
// AVANT — INTERDIT
<div className="w-8 h-8 rounded-[9px] bg-primary/10 flex items-center justify-center">
  <i className="fa-solid fa-star text-primary text-sm" />
</div>
```
**Action :** Supprimer le div wrapper, garder `<i className="fa-solid fa-star text-primary text-sm" />` seul.

### 1.3 `PotentialEarningsCard` — 4 violations
- Header : `bg-amber-50` autour de `fa-sack-dollar` → supprimer wrapper
- Section totaux : `bg-amber-100` autour de `fa-coins` → supprimer wrapper ; `bg-primary/10` autour de `fa-star` → supprimer wrapper
- Lignes déclarations : `bg-amber-50` autour de l'icône doc → supprimer wrapper
- **Attention :** La section stats `bg-amber-50/50` est un fond de zone entière, pas un fond d'icône → la garder est discutable. Par sécurité, la remplacer par `bg-surface2` pour rester dans les tons neutres.

### 1.4 `TransactionsCard` — fond coloré icône header
```tsx
// AVANT — INTERDIT
<div className="w-8 h-8 rounded-[9px] bg-green-light flex items-center justify-center">
  <i className="fa-solid fa-clock-rotate-left text-green-mid text-sm" />
</div>
```
**Action :** Supprimer wrapper, icône seule.

Également dans les lignes de transactions : `getTxMeta` retourne `bg` (ex: `bg-green-light`, `bg-orange-50`, `bg-blue-50`) utilisé dans les icônes de chaque transaction. Supprimer le div wrapper dans `TransactionsCard` et retirer `bg` du retour de `getTxMeta`.

### 1.5 `EarningsHistoryCard` — fond coloré icône header + lignes
Même pattern que `TransactionsCard`. `getEarningMeta` retourne `bg` utilisé dans les wrappers d'icônes. Supprimer les wrappers dans `EarningsHistoryCard`, retirer `bg` de `getEarningMeta`.

### 1.6 `PaymentMethodCard` — fond coloré
```tsx
// AVANT — INTERDIT
<div className={`w-9 h-9 rounded-[10px] ${bg} flex items-center justify-center flex-shrink-0`}>
  <i className={`fa-solid ${icon} ${color} text-sm`} />
</div>
```
**Action :** Supprimer wrapper. Supprimer prop `bg` dans les appels. Icône seule avec sa couleur.

### 1.7 `WithdrawHistoryModal` — fond coloré icône
```tsx
<div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center">
  <i className="fa-solid fa-arrow-right-from-bracket text-blue-400 text-sm" />
</div>
```
Supprimer wrapper.

### 1.8 `SavedMethodsModal` — `typeBg()` helper
Même pattern, `typeBg()` retourne `bg-yellow-50` / `bg-orange-50` / `bg-blue-50`. Supprimer les wrappers dans `SavedMethodsModal`.

### 1.9 `AddPaymentMethodModal` — fond coloré
```tsx
<div className={`w-9 h-9 rounded-[10px] ${typeBg} flex items-center justify-center`}>
```
Supprimer wrapper.

### 1.10 `WithdrawModal` — fond coloré dans la liste des méthodes sauvegardées
```tsx
<div className={`w-9 h-9 rounded-[10px] ${typeBg} flex items-center justify-center`}>
```
Supprimer wrapper.

### 1.11 Section "Méthodes de retrait" inline dans `MesGains`
Le bloc JSX dans `MesGains` a :
```tsx
<div className="w-8 h-8 rounded-[9px] bg-green-light flex items-center justify-center">
  <i className="fa-solid fa-mobile-screen-button text-green-mid text-sm" />
</div>
```
Supprimer wrapper.

### 1.12 `WalletCard` — GARDER tel quel
La `WalletCard` a son propre `linear-gradient` et des fonds `bg-white/10`, `bg-primary/[0.08]` qui sont des décorations de la carte elle-même (pas des fonds autour d'icônes au sens strict). La règle dit explicitement de garder cette carte. **Ne pas toucher.**

---

## 2. Nouvelle structure JSX du layout

### Vue d'ensemble
```
MesGains (root div)
├── [Mobile only] Tab bar (md:hidden)
├── [Desktop] Deux colonnes (hidden md:flex flex-row gap-4)
│   ├── Left panel — Carte & Gains (w-[45%] overflow-y-auto)
│   └── Right panel — Historique (flex-1 overflow-y-auto)
├── [Mobile] Section active (md:hidden)
│   ├── Panel "gains" (visible si activeSection === "gains")
│   └── Panel "history" (visible si activeSection === "history")
└── Modals (inchangés)
```

### JSX cible

```tsx
export default function MesGains() {
  // ... (tous les états existants inchangés)
  const [activeSection, setActiveSection] = useState<"gains" | "history">("gains");

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Tab bar mobile ── */}
      <div className="md:hidden flex gap-1 px-4 pt-4 pb-2 bg-bgMain border-b border-borderMain">
        <button
          onClick={() => setActiveSection("gains")}
          className={`flex-1 py-2 text-[13px] font-bold rounded-full transition-all ${
            activeSection === "gains"
              ? "border-b-2 border-green-dark text-green-dark"
              : "text-textMuted"
          }`}
        >
          <i className="fa-solid fa-wallet mr-1.5" />
          Carte & Gains
        </button>
        <button
          onClick={() => setActiveSection("history")}
          className={`flex-1 py-2 text-[13px] font-bold rounded-full transition-all ${
            activeSection === "history"
              ? "border-b-2 border-green-dark text-green-dark"
              : "text-textMuted"
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left mr-1.5" />
          Historique
        </button>
      </div>

      {/* ── Desktop : deux colonnes côte à côte ── */}
      <div className="hidden md:flex flex-row gap-4 flex-1 overflow-hidden px-6 py-6">

        {/* Left panel — Carte & Gains */}
        <div className="w-[45%] overflow-y-auto custom-scroll h-[calc(100vh-130px)]">
          <Stack gap="lg" pb="xl">
            <WalletCard ... />
            <div className="grid grid-cols-2 gap-3">
              <StatCard ... /> {/* ×4 */}
            </div>
            <PotentialEarningsCard ... />
            <PointsCard ... />
            {/* Section méthodes de retrait */}
            <div className="bg-white border border-borderMain rounded-[18px] p-5">
              ...
            </div>
          </Stack>
        </div>

        {/* Right panel — Historique */}
        <div className="flex-1 overflow-y-auto custom-scroll h-[calc(100vh-130px)]">
          <Stack gap="lg" pb="xl">
            <TransactionsCard ... />
            <EarningsHistoryCard ... />
          </Stack>
        </div>

      </div>

      {/* ── Mobile : section active plein écran ── */}
      <div className="md:hidden flex-1 overflow-y-auto custom-scroll">
        {activeSection === "gains" && (
          <div className="p-4 pb-24">
            <Stack gap="lg">
              <WalletCard ... />
              <div className="grid grid-cols-2 gap-3">
                <StatCard ... /> {/* ×4 */}
              </div>
              <PotentialEarningsCard ... />
              <PointsCard ... />
              <div className="bg-white border border-borderMain rounded-[18px] p-5">
                ...
              </div>
            </Stack>
          </div>
        )}
        {activeSection === "history" && (
          <div className="p-4 pb-24">
            <Stack gap="lg">
              <TransactionsCard ... />
              <EarningsHistoryCard ... />
            </Stack>
          </div>
        )}
      </div>

      {/* Modals — inchangés */}
      ...
    </div>
  );
}
```

**Note importante :** Le root `div` passe de `flex flex-col` à `flex flex-col flex-1 overflow-hidden` pour que le layout deux colonnes fonctionne correctement avec la hauteur fixe. Le padding `px-4 sm:px-6 py-6` passe à l'intérieur des panels (le desktop utilise `px-6 py-6`, le mobile utilise `p-4`).

---

## 3. États React nécessaires

### Nouvel état à ajouter
```tsx
const [activeSection, setActiveSection] = useState<"gains" | "history">("gains");
```

### États existants à conserver TELS QUELS
- `transactions`, `txLoading`
- `statsData`, `minWithdrawal`
- `earningsHistory`, `earningsLoading`
- `declarations`
- `showWithdrawModal`, `showHistoryModal`, `showMethodsModal`, `showAddMethodModal`, `showConvertModal`
- `addMethodType`
- `savedMethods`
- Toutes les variables dérivées (`balance`, `points`, `progressPct`, etc.)

---

## 4. Ordre d'implémentation

### Étape 1 — Nettoyer les violations design (sous-composants)
Traiter dans cet ordre pour minimiser les risques de conflits :

1. **`StatCard`** : Supprimer le div wrapper `bg-*`, supprimer les props `bg` dans les 4 appels. Garder `icon`, `color`, `value`, `label`. L'icône doit avoir `text-xl mb-3` ou `text-2xl` pour compenser l'absence du wrapper.

2. **`getTxMeta` et `getEarningMeta`** : Retirer le champ `bg` du retour (ou le garder mais ne pas l'utiliser). Plus propre : supprimer le champ.

3. **`TransactionsCard`** : Supprimer le wrapper div des icônes (header + lignes de transactions). Icône seule avec sa `color`.

4. **`EarningsHistoryCard`** : Même traitement que `TransactionsCard`.

5. **`PotentialEarningsCard`** : Supprimer les 4 wrappers bg. Remplacer `bg-amber-50/50` par `bg-surface2` pour la section totaux.

6. **`PointsCard`** : Supprimer le wrapper bg autour de `fa-star` dans le header.

7. **`PaymentMethodCard`** : Supprimer wrapper bg, supprimer prop `bg` dans les appels.

8. **Section méthodes inline** dans `MesGains` JSX : Supprimer le wrapper bg autour de `fa-mobile-screen-button`.

9. **Modals** (`WithdrawModal`, `WithdrawHistoryModal`, `SavedMethodsModal`, `AddPaymentMethodModal`) : Supprimer les wrappers bg dans chacun.

### Étape 2 — Ajouter l'état `activeSection`
```tsx
const [activeSection, setActiveSection] = useState<"gains" | "history">("gains");
```
Ajouter après les états existants.

### Étape 3 — Restructurer le JSX du composant `MesGains`
Remplacer le `div` root et son contenu unique par la structure à 3 zones :
1. Tab bar mobile
2. Layout desktop deux colonnes
3. Layout mobile section active

Les props passées aux sous-composants restent identiques — seule la structure wrapping change.

### Étape 4 — Vérification build
```bash
cd /home/ruxel/Docmaster/Docmaster-web && npm run build
```
Aucune erreur TypeScript ni Vite ne doit être rapportée.

---

## 5. Risques à éviter

### Risque 1 — Duplication des props des sous-composants
Le même sous-composant apparaît deux fois dans le JSX final (une fois dans le panel desktop, une fois dans le panel mobile). Les props doivent être identiques dans les deux occurrences. Solution : définir les blocs JSX dans des variables intermédiaires si la duplication devient lourde, ou accepter la duplication explicite (plus lisible).

**Recommandation :** Factoriser en variables `const gainsPanel = (...)` et `const historyPanel = (...)` avant le `return`, puis les référencer dans les deux zones.

### Risque 2 — `h-[calc(100vh-130px)]` incorrect sur le panel desktop
La hauteur `130px` est une estimation de topbar + padding. Si la topbar change de hauteur, les panels scrollent mal. Vérifier visuellement. Valeur ajustable facilement.

### Risque 3 — `overflow-hidden` sur le root peut bloquer les modals
Les modals Mantine utilisent un portail (`document.body`) donc ne sont pas affectés par `overflow-hidden`. Pas de risque.

### Risque 4 — Suppression du prop `bg` dans `StatCard`
Le composant `StatCard` est aussi utilisé dans d'autres pages (`Portefeuille.tsx`, `Dashboard.tsx` des partenaires). **NE PAS modifier** le composant `src/components/ui/StatCard.tsx` — ce plan ne concerne que la version locale inline dans `MesGains.tsx`. La `StatCard` dans `MesGains.tsx` est définie localement dans le même fichier, indépendante du composant UI partagé.

### Risque 5 — Appel `border-2 border-primary` dans `PaymentMethodCard`
`PaymentMethodCard` utilise `border-2` quand `hasMethod` est vrai. La règle AGENTS.md interdit les bordures colorées différentes de `borderMain`, mais `border-primary` (#F5A64B) est la couleur principale du système de design — son usage comme indicateur d'état sélectionné est acceptable (c'est un état interactif, pas un décor de card statique). Conserver.

### Risque 6 — Scroll mobile
Sur mobile, ne pas mettre `overflow-hidden` sur le conteneur mobile — laisser `overflow-y-auto` uniquement sur la div contenant le contenu actif. Le `pb-24` assure que le contenu ne passe pas derrière la bottom navbar.

### Risque 7 — `borderMain` vs `border-borda`
Le fichier existant utilise partout `border-borda` (classe Tailwind définie dans le config). C'est l'équivalent de `borderMain`. Continuer à utiliser `border-borda` pour la cohérence interne, ne pas introduire `border-borderMain` qui pourrait ne pas être défini.

---

## Récapitulatif des fichiers modifiés

| Fichier | Nature de la modification |
|---|---|
| `src/pages/auth/MesGains.tsx` | Seul fichier modifié |

**Sous-composants modifiés dans ce fichier :**
- `StatCard` : supprimer wrapper bg, supprimer prop `bg`
- `PointsCard` : supprimer wrapper bg header
- `PotentialEarningsCard` : supprimer 4 wrappers bg, remplacer `bg-amber-50/50` par `bg-surface2`
- `TransactionsCard` : supprimer wrapper bg header
- `EarningsHistoryCard` : supprimer wrapper bg header
- `PaymentMethodCard` : supprimer wrapper bg, supprimer prop `bg`
- `WithdrawModal` : supprimer wrappers bg dans la liste méthodes
- `WithdrawHistoryModal` : supprimer wrapper bg
- `SavedMethodsModal` : supprimer wrappers bg
- `AddPaymentMethodModal` : supprimer wrapper bg
- Section méthodes inline dans `MesGains` JSX : supprimer wrapper bg
- `getTxMeta` / `getEarningMeta` : supprimer champ `bg` du retour

**Composant page `MesGains` :**
- Ajouter état `activeSection`
- Restructurer le JSX : root div → tab mobile + desktop 2 colonnes + mobile section active
