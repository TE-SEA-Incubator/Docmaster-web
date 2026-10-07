# Plan d'implémentation — Refonte sections Coffre-fort et Protection Documents

## Contexte

La page d'accueil (`src/pages/public/Home.tsx`) contient actuellement une section `VaultDeviceSection` (lignes 795-934) qui affiche une mosaïque de 6 photos de documents avec texte détaillé sur le côté droit.

**Objectif :** Remplacer cette section par **2 cartes horizontales côte à côte** inspirées d'un design minimaliste, respectant strictement les contraintes AGENTS.md (pas de fond coloré sur icônes, pas de gradients, pas de bordures colorées).

---

## Fichiers à modifier

1. **`src/pages/public/Home.tsx`** — Section `VaultDeviceSection` (lignes 795-934)
2. **`src/js/i18n/fr.ts`** — Ajout/modification des clés i18n
3. **`src/js/i18n/en.ts`** — Ajout/modification des clés i18n (traductions EN)
4. **`src/js/i18n/ar.ts`** — Ajout/modification des clés i18n (traductions AR)

---

## Étapes d'implémentation

- [ ] **1. Modifier les clés i18n pour les 2 nouvelles cartes**

   **Fichiers :** `src/js/i18n/fr.ts`, `src/js/i18n/en.ts`, `src/js/i18n/ar.ts`
   
   **Actions :**
   - Dans `fr.ts` (ligne ~739-749), remplacer les clés existantes `home_vault_*` et `home_device_*` par :
     ```typescript
     // Carte 1 — Enregistrement appareil
     home_card_device_title: "Enregistrez votre appareil",
     home_card_device_desc: "En cas de vol après signalement, vous êtes immédiatement notifié et protégé",
     home_card_device_link: "En savoir plus",
     
     // Carte 2 — Partage documents
     home_card_docs_title: "Partagez vos documents",
     home_card_docs_desc: "Accédez à vos documents médicaux même quand vous ne les avez pas physiquement sur vous",
     home_card_docs_link: "En savoir plus",
     ```
   - Ajouter les traductions équivalentes en anglais dans `en.ts`
   - Ajouter les traductions équivalentes en arabe dans `ar.ts`
   
   **Vérification :** 
   ```bash
   npm run dev
   # Vérifier que les clés s'affichent correctement dans la console (pas d'erreur i18n)
   # Tester le changement de langue (FR/EN/AR) et confirmer que les nouvelles clés sont bien traduites
   ```

---

- [ ] **2. Remplacer la section `VaultDeviceSection` dans Home.tsx**

   **Fichier :** `src/pages/public/Home.tsx` (lignes 795-934)
   
   **Actions :**
   - Supprimer entièrement la fonction `VaultDeviceSection` existante (lignes 795-934) incluant :
     - L'array `vaultCards` avec les 6 images Unsplash
     - L'array `vaultFeatures` avec les 5 features
     - La grille mosaïque gauche + texte droit
   
   - Créer une nouvelle fonction `VaultDeviceSection` avec cette structure :
   
   ```tsx
   function VaultDeviceSection({ t }) {
     return (
       <section className="py-20 px-5 bg-white">
         <div className="max-w-6xl mx-auto">
           {/* Grid 2 colonnes desktop, 1 colonne mobile */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             
             {/* ── Carte 1 : Enregistrement Appareil ── */}
             <div className="bg-[#FAFAFA] rounded-3xl p-8 border border-[#EAE3D8] flex flex-col justify-between min-h-[280px]">
               <div className="flex-1">
                 <h3 className="font-bricolage text-[1.5rem] font-bold text-textMain mb-3 leading-tight">
                   {t("home_card_device_title")}
                 </h3>
                 <p className="text-textMuted text-[14px] leading-relaxed mb-6">
                   {t("home_card_device_desc")}
                 </p>
               </div>
               
               <div className="flex items-end justify-between">
                 <a
                   href="#"
                   className="inline-flex items-center gap-2 text-primary font-semibold text-[13px] hover:gap-3 transition-all"
                 >
                   {t("home_card_device_link")}
                   <i className="fa-solid fa-arrow-right text-[11px]" />
                 </a>
                 
                 {/* Icône minimaliste à droite, SANS fond coloré */}
                 <i className="fa-solid fa-mobile-screen-button text-green-dark text-5xl opacity-20" />
               </div>
             </div>
             
             {/* ── Carte 2 : Partage Documents ── */}
             <div className="bg-[#FAFAFA] rounded-3xl p-8 border border-[#EAE3D8] flex flex-col justify-between min-h-[280px]">
               <div className="flex-1">
                 <h3 className="font-bricolage text-[1.5rem] font-bold text-textMain mb-3 leading-tight">
                   {t("home_card_docs_title")}
                 </h3>
                 <p className="text-textMuted text-[14px] leading-relaxed mb-6">
                   {t("home_card_docs_desc")}
                 </p>
               </div>
               
               <div className="flex items-end justify-between">
                 <a
                   href="#"
                   className="inline-flex items-center gap-2 text-primary font-semibold text-[13px] hover:gap-3 transition-all"
                 >
                   {t("home_card_docs_link")}
                   <i className="fa-solid fa-arrow-right text-[11px]" />
                 </a>
                 
                 {/* Icône minimaliste à droite, SANS fond coloré */}
                 <i className="fa-solid fa-share-nodes text-green-dark text-5xl opacity-20" />
               </div>
             </div>
             
           </div>
         </div>
       </section>
     );
   }
   ```
   
   **Points de vigilance :**
   - ✅ **PAS** de `bg-green-light`, `bg-primary-light`, `bg-red-100` autour des icônes
   - ✅ **PAS** de `bg-gradient-to-r` ou autre gradient
   - ✅ **PAS** de `border-green-500` ou bordure colorée — uniquement `border-[#EAE3D8]`
   - ✅ Icônes seules avec couleur : `text-green-dark` avec `opacity-20` pour effet subtil
   - ✅ Fond des cartes : `bg-[#FAFAFA]` (gris très clair)
   - ✅ `rounded-3xl` pour les cartes (arrondi généreux)
   - ✅ Liens avec flèche animée au hover (`hover:gap-3`)
   
   **Vérification :**
   ```bash
   npm run dev
   # Ouvrir http://localhost:3003
   # Scroll jusqu'à la section "Mieux vaut prévenir que guérir" (remplacée)
   # Desktop : vérifier que les 2 cartes sont côte à côte
   # Mobile : vérifier que les 2 cartes sont empilées verticalement
   # Vérifier que les icônes N'ONT PAS de fond coloré
   # Vérifier que les liens "En savoir plus →" fonctionnent au hover
   ```

---

- [ ] **3. Vérification finale cross-browser et responsive**

   **Actions :**
   - Tester sur desktop (1920px, 1366px)
   - Tester sur tablette (768px)
   - Tester sur mobile (375px, 390px)
   - Vérifier que les cartes ne débordent pas
   - Vérifier que les textes ne sont pas tronqués
   - Vérifier que les icônes sont bien visibles et proportionnées
   - Tester les 3 langues (FR, EN, AR) et confirmer que les layouts restent cohérents
   
   **Vérification :**
   ```bash
   npm run build
   # Confirmer que le build se termine sans erreur
   # Ouvrir l'application en mode production (npm run preview)
   # Re-tester toutes les tailles d'écran
   ```

---

## Notes importantes

### Design minimaliste de référence
- Fond blanc ou gris très clair (`#FAFAFA`)
- Pas de fond coloré sur les icônes (contrainte stricte AGENTS.md)
- Icônes grandes (text-5xl) avec opacité réduite (`opacity-20`) pour effet watermark subtil
- Liens avec animation au hover (espacement de la flèche)
- Border radius généreux (`rounded-3xl`)
- Padding généreux (`p-8`)
- Hauteur minimale (`min-h-[280px]`) pour uniformité

### Contraintes AGENTS.md à respecter
```
❌ INTERDIT :
- <div className="w-8 h-8 bg-green-light flex items-center justify-center">
- bg-gradient-to-r from-green-dark to-green-mid
- border-2 border-green-500

✅ AUTORISÉ :
- <i className="fa-solid fa-key text-green-dark" />
- bg-white ou bg-[#FAFAFA]
- border border-[#EAE3D8]
```

### Stack utilisé
- React + TypeScript + Vite
- Tailwind CSS (config custom dans `tailwind.config.js`)
- FontAwesome (icônes via `fa-solid fa-...`)
- i18n via `useI18n()` hook
- Pas de Mantine UI dans cette section (Tailwind pur)

### Commandes de vérification
```bash
npm run dev          # Lancer le serveur de dev (port 3003)
npm run build        # Build de production
npm run preview      # Preview du build
```

---

## Résumé des changements

| Fichier | Lignes modifiées | Type de modification |
|---------|------------------|---------------------|
| `src/js/i18n/fr.ts` | ~739-749 | Remplacement clés i18n |
| `src/js/i18n/en.ts` | ~739-749 | Ajout traductions EN |
| `src/js/i18n/ar.ts` | ~739-749 | Ajout traductions AR |
| `src/pages/public/Home.tsx` | 795-934 | Remplacement section complète |

**Total :** ~140 lignes supprimées, ~60 lignes ajoutées (réduction nette de code)

---

## Checklist finale

- [ ] Les 2 cartes s'affichent côte à côte sur desktop
- [ ] Les 2 cartes s'empilent verticalement sur mobile
- [ ] Les icônes N'ONT PAS de fond coloré
- [ ] Les cartes ont un fond gris très clair (`#FAFAFA`)
- [ ] Les bordures sont neutres (`#EAE3D8`)
- [ ] Les liens "En savoir plus" ont une animation au hover
- [ ] Les textes sont traduits en FR/EN/AR
- [ ] Le build se termine sans erreur
- [ ] La page se charge sans erreur console
- [ ] Le design respecte AGENTS.md (pas de violations)
