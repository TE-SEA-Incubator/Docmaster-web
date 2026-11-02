# 🎨 Guide de Migration : Mantine Modal → shadcn/ui Dialog

## ✅ Setup Initial (FAIT)

### Dépendances installées
```bash
npm install @radix-ui/react-dialog @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
```

### Composants créés
- ✅ `src/lib/utils.ts` - Helper `cn()` pour classes
- ✅ `src/components/ui/dialog.tsx` - Dialog shadcn
- ✅ `src/components/ui/button.tsx` - Button shadcn

---

## 📖 Syntaxe : Avant / Après

### Mantine Modal → shadcn Dialog

#### **Avant** (Mantine)
```tsx
import { Modal } from "@mantine/core";

<Modal opened={isOpen} onClose={onClose} title="Mon titre" size="sm">
  <p>Contenu ici</p>
  <Button onClick={onClose}>Fermer</Button>
</Modal>
```

#### **Après** (shadcn)
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";

<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Mon titre</DialogTitle>
      <DialogDescription>Description optionnelle</DialogDescription>
    </DialogHeader>
    
    <p>Contenu ici</p>
    
    <Button onClick={onClose}>Fermer</Button>
  </DialogContent>
</Dialog>
```

---

## 🔄 Mapping des Props

| Mantine | shadcn | Notes |
|---------|--------|-------|
| `opened={bool}` | `open={bool}` | État ouvert/fermé |
| `onClose={fn}` | `onOpenChange={fn}` | Callback fermeture |
| `title="..."` | `<DialogTitle>...</DialogTitle>` | Titre en composant |
| `size="sm"` | `className="max-w-md"` | Taille via className |
| `size="md"` | `className="max-w-lg"` | (défaut) |
| `size="lg"` | `className="max-w-2xl"` | Grande modal |
| `size="xl"` | `className="max-w-4xl"` | Très grande |
| - | `<DialogDescription>` | Description sous titre |

---

## 🎨 Tailles Modals

```tsx
{/* Petit */}
<DialogContent className="max-w-sm">  {/* 384px */}

{/* Moyen (défaut) */}
<DialogContent className="max-w-md">  {/* 448px */}

{/* Large */}
<DialogContent className="max-w-lg">  {/* 512px */}

{/* Extra Large */}
<DialogContent className="max-w-2xl"> {/* 672px */}

{/* Full Width */}
<DialogContent className="max-w-full mx-4">
```

---

## 📝 Exemple Complet : WithdrawalHistoryModal

### Avant (Mantine)
```tsx
function WithdrawalHistoryModal({ onClose, withdrawals, loading, t }: any) {
  return (
    <Modal opened onClose={onClose} title={t("mesgains_withdraw_history_modal_title")} size="sm">
      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" color="gold" />
        </Group>
      ) : withdrawals.length === 0 ? (
        <Stack align="center" py="xl" gap="sm">
          <i className="fa-solid fa-arrow-right-from-bracket text-3xl opacity-20" />
          <Text size="sm" c="dimmed">{t("mesgains_withdraw_history_empty")}</Text>
        </Stack>
      ) : (
        <Stack gap={0} className="divide-y divide-borda">
          {withdrawals.map((w: any) => (
            <Group key={w.id} px="lg" py="sm" gap="md">
              <i className="fa-solid fa-arrow-right-from-bracket text-blue-400" />
              <div>
                <Text size="sm" fw={600}>{w.amount} XAF</Text>
                <Text size="xs" c="dimmed">{w.payment_method}</Text>
              </div>
            </Group>
          ))}
        </Stack>
      )}
    </Modal>
  );
}
```

### Après (shadcn)
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

function WithdrawalHistoryModal({ isOpen, onClose, withdrawals, loading, t }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("mesgains_withdraw_history_modal_title")}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <i className="fa-solid fa-arrow-right-from-bracket text-4xl opacity-20" />
            <p className="text-sm text-textMuted">{t("mesgains_withdraw_history_empty")}</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-borderMain">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center gap-4 px-4 py-3">
                <i className="fa-solid fa-arrow-right-from-bracket text-blue-400" />
                <div>
                  <p className="text-sm font-semibold">{w.amount} XAF</p>
                  <p className="text-xs text-textMuted">{w.payment_method}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔧 Composants Mantine → Remplacement

| Mantine | Remplacement |
|---------|--------------|
| `<Modal>` | `<Dialog>` + `<DialogContent>` |
| `<Group>` | `<div className="flex gap-2">` |
| `<Stack>` | `<div className="flex flex-col gap-2">` |
| `<Text>` | `<p className="text-sm">` |
| `<Title>` | `<h2 className="text-xl font-bold">` |
| `<Loader>` | `<div className="animate-spin ...">` |
| `<Button>` | `<Button>` (shadcn) |
| `<Badge>` | `<span className="badge">` (custom) |

---

## ⚡ Optimisations shadcn

### Animations automatiques
- ✅ Fade in/out
- ✅ Zoom in/out
- ✅ Slide in/out
- ✅ Backdrop blur

### Accessibilité
- ✅ Focus trap automatique
- ✅ ESC pour fermer
- ✅ ARIA labels
- ✅ Screen reader friendly

### Performance
- ✅ Pas de JS inutile
- ✅ Radix UI optimisé
- ✅ Tree-shakeable

---

## 📋 Plan de Migration

### Phase 1 : Modals Simples (2-3h)
- [ ] WithdrawalHistoryModal (MesGains.tsx)
- [ ] SavedMethodsModal (MesGains.tsx)
- [ ] CompleteDeclarationModal
- [ ] PollingModal

### Phase 2 : Modals Forms (3-4h)
- [ ] Device Add/Edit Modal (MesAppareils.tsx)
- [ ] Document Add Modal (MesDocuments.tsx)
- [ ] Declaration Modal
- [ ] Withdrawal Modal

### Phase 3 : Modals Admin (2-3h)
- [ ] User Edit Modal
- [ ] Settings Modal
- [ ] Broadcast Modal

### Phase 4 : Cleanup (1h)
- [ ] Retirer imports Mantine non utilisés
- [ ] Tester toutes les modals
- [ ] Documenter les changements

---

## 🎯 Checklist par Modal

Pour chaque modal :
1. [ ] Identifier tous les imports Mantine
2. [ ] Remplacer `<Modal>` par `<Dialog>` + `<DialogContent>`
3. [ ] Convertir `opened` → `open`
4. [ ] Convertir `onClose` → `onOpenChange`
5. [ ] Remplacer `<Group>` / `<Stack>` par flex
6. [ ] Remplacer `<Text>` par `<p>` avec classes
7. [ ] Tester la modal
8. [ ] Vérifier responsive mobile

---

## 🚀 Commandes Utiles

```bash
# Trouver toutes les modals Mantine
grep -r "from \"@mantine/core\"" src/ | grep Modal

# Compter les modals
grep -r "<Modal" src/ | wc -l

# Build et test
npm run build
npm run dev
```

---

## 💡 Tips

### Garder cohérence design
```tsx
// Toujours utiliser ces classes de base
<DialogContent className="max-w-md"> {/* Taille */}
  <DialogHeader>
    <DialogTitle>...</DialogTitle>
  </DialogHeader>
  
  {/* Contenu avec padding */}
  <div className="py-4">
    ...
  </div>
</DialogContent>
```

### Animations custom
```tsx
<DialogContent className="max-w-md data-[state=open]:duration-300">
  ...
</DialogContent>
```

### Mobile responsive
```tsx
<DialogContent className="max-w-md w-[calc(100%-2rem)] mx-4">
  ...
</DialogContent>
```

---

**Temps total estimé** : 8-12h pour ~30-40 modals  
**Priorité** : Commencer par les modals les plus utilisées
