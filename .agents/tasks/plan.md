# Implementation Plan — 2-Step Payment Modal

## Context & Findings

**File to modify:** `src/components/modals/PaymentModal.tsx` (single source of truth, used by 5 callers)

**Callers (all pass the same props — no caller changes needed):**
- `src/pages/auth/Abonnement.tsx` — passes `children` with plan summary
- `src/pages/auth/AcheterPoints.tsx` — basic usage
- `src/pages/auth/Recuperer.tsx` — basic usage
- `src/components/ui/PromoBanner.tsx` — basic usage
- `src/components/ui/PromoPopup.tsx` — basic usage

**Props interface stays the same** — `isOpen`, `onClose`, `onPay`, `amount`, `title`, `description`, `termsText`, `processing`, `error`, `children`, `submitLabel`. No caller needs to change.

**Current method IDs:** `"orange"` | `"mtn"` | `"points"` — these are passed to `onPay()`, must stay unchanged.

**Saved payment methods:** already loaded inside `PaymentModal` from `paymentsService.getPaymentMethods()`. Keep this logic, moved to Step 2.

**Mantine version:** ^9.4.2 — `Stepper` from `@mantine/core` is available, but the project already has a custom `src/components/modals/Stepper.tsx` (horizontal + vertical, plain CSS). **Use local state (step: 1 | 2) + the project's own `<Stepper>` component** for consistency — no Mantine Stepper needed.

**Logo assets:** No Orange Money / MTN / Moov logos in `src/assets/images/`. Use styled circles with initials: orange `O`, yellow `M`, teal `V`.

**Design rules (AGENTS.md):**
- No colored backgrounds on icon wrappers → use border trick for selected state only
- No gradients
- Selected card border: `border: "2px solid #2D5A42"` (green-dark) via inline style
- Unselected card border: `borderColor: "var(--mantine-color-default-border)"` or Tailwind `border-borderMain`
- Primary button: `style={{ backgroundColor: "#2D5A42" }}`
- No `bg-orange-500`, `bg-yellow-500`, `bg-green-500` icon wrapper divs

**Colors from tailwind.config.js:** `green-dark: #2D5A42`, `borderMain: #EAE3D8`, `bgMain: #FFFFFF`, `textMain: #1A1A1A`, `textMuted: #6B7280`, `primary: #F5A64B`

---

## Plan

- [ ] 1. Refactor `PaymentModal.tsx` into a 2-step flow using local state.

  **Step logic:**
  - `step` state: `1 | 2`, initialized to `1` on every open (`useEffect` on `isOpen`).
  - `selectedMethod` state: `"orange" | "mtn" | "points" | ""`, reset on open.
  - Reset phone/saved method state when going back to step 1.

  **Step 1 — Method selection:**
  - Render the existing project `<Stepper>` component (from `../../components/modals/Stepper`) in horizontal mode with 2 steps: `["Méthode de paiement", "Confirmation"]`, `currentStep={1}`.
  - Display `title` prop (or fallback `t("payment_title")`).
  - Display `children` prop here (plan summary injected by Abonnement).
  - Amount summary block (same as current `p-4 bg-bgMain rounded-[16px]` block) — keep exact same markup.
  - Three method cards (Orange Money, MTN Mobile Money, Points) + disabled PayPoint card:
    - Each card: `<div>` with `cursor-pointer`, `rounded-[14px]`, `p-4`, `border border-borderMain` when not selected, `border-2 style={{ borderColor: "#2D5A42" }}` when selected.
    - **Icon circle** (AGENTS.md compliant — no colored bg):
      - Orange: `<div className="w-10 h-10 rounded-full border-2 border-borderMain flex items-center justify-center"><span className="font-bricolage font-black text-base" style={{ color: "#F97316" }}>O</span></div>` — just text, no bg fill.
      - MTN: same structure, letter `M`, color `#EAB308`.
      - Moov Money (new): letter `V`, color `#0D9488` (teal — brand color). Method id: `"moov"` — **but `onPay` only accepts `"orange" | "mtn" | "points"`**. Moov is currently not supported by the backend (`paymentsService` only has `MTN` and `ORANGE` types). **Decision: show Moov Money card as "Bientôt disponible" / disabled**, same as PayPoint. Keep the three active methods as `orange`, `mtn`, `points`.
      - Points: `<i className="fa-solid fa-star" style={{ color: "#F5A64B" }} />` inside the circle.
    - Section headers `"Mobile Money"` and `"Autres"` in `text-[10px] uppercase font-bold text-textMuted`.
  - "Continuer" button at the bottom: `disabled` when `!selectedMethod`, `style={{ backgroundColor: "#2D5A42" }}`, `onClick={() => setStep(2)}`.

  **Step 2 — Phone + Confirm:**
  - Render `<Stepper>` with `currentStep={2}`.
  - Back button (`variant="subtle"` or a text link) → `setStep(1)`.
  - Show selected method name + icon (no colored background on icon, just the letter).
  - Amount display block (same markup as Step 1 — repeat it here too for clarity).
  - Phone input section (conditional on `payMethod !== "points"`): exact same input markup and saved-methods toggle as the current code.
  - `termsText` rendered below phone input if provided.
  - Pay button: `style={{ backgroundColor: "#2D5A42" }}`, `disabled` logic unchanged from current `handleSubmit` guard.
  - `error` alert block: same markup as current.
  - `processing` spinner: same as current.

  **State resets:**
  ```ts
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPayMethod("");
      setPayPhone("");
      setPhoneErr("");
      setUseSaved(false);
      setSelectedSaved(null);
    }
  }, [isOpen]);
  ```

  **Files:**
  - Modify: `src/components/modals/PaymentModal.tsx`
  - Read (do not modify): `src/components/modals/Stepper.tsx` (import it)

  **Verify:** `npm run build` in `/home/ruxel/Docmaster/Docmaster-web` — must exit 0 with no TypeScript errors.

---

## Design rules checklist for the implementer

| Rule | Application in this component |
|---|---|
| No colored icon backgrounds | Icon circles use `border-borderMain` + colored text/icon only. No `bg-orange-500`, `bg-yellow-500`, etc. |
| No gradients | No `bg-gradient-*` anywhere |
| Selected card border | `style={{ borderColor: "#2D5A42", borderWidth: 2 }}` on selected card only |
| Unselected card border | `className="border border-borderMain"` (Tailwind) |
| Primary button | `style={{ backgroundColor: "#2D5A42" }}` |
| Danger/secondary button | Back button: `variant="subtle"` or plain text, no filled red |
| No bright filled badges/alerts | Error shown as `Alert color="red" variant="light"` or the existing red `<div>` |

## Props interface — no changes

```ts
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPay: (method: "orange" | "mtn" | "points", phone: string) => Promise<void>;
  amount: number;
  title?: string;
  description?: string;
  termsText?: React.ReactNode;
  processing: boolean;
  error: string;
  children?: React.ReactNode;
  submitLabel?: string;
}
```

All 5 callers remain untouched.

## Build verification

```
cd /home/ruxel/Docmaster/Docmaster-web && npm run build
```

Expected: exit 0, no TS errors, `dist/` produced.
