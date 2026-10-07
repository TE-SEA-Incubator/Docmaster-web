# Two-panel layout refactor and design-violation cleanup for MesGains — pass 2

The change splits MesGains from a single scrolling column into a two-panel desktop view and a tab-toggled mobile view. Alongside the layout restructure, two commits systematically removed all colored `div` wrappers around icons and replaced raw `<span>` status badges with Mantine `Badge` components. The second commit (`b6a4334`) directly addressed the three blocking issues raised in the first review pass: the `TxStatusBadge` and `WithdrawHistoryModal.statusBadge` spans are now `<Badge variant="light" …>`, and the `PointsCard` convert button was neutralised from `bg-primary/10` to `bg-surface2 border-borda`.

**Verdict**: APPROVED

---

## High-level view

The desktop layout is correctly assembled: `hidden md:flex flex-row` with two independently-scrollable columns, both at `height: calc(100vh - 130px)`, left fixed at `w-[45%]` and right at `flex-1`. The mobile tab bar is `flex md:hidden`; the inactive section is conditionally not rendered (not just hidden), so scroll position resets on tab switch — acceptable here. Bottom-nav clearance is covered by `pb-24` on each mobile section.

Every colored icon wrapper from the prior pass has been removed. The three surviving issues flagged in pass 1 are all addressed: `TxStatusBadge`, `WithdrawHistoryModal.statusBadge`, and `PointsCard` convert button. The `WalletCard` `linear-gradient` was confirmed pre-existing (`1731cdc` base) and falls outside the scope of this diff.

Remaining `bg-red-50` instances are error-state alert containers (not icon wrappers), and `bg-gray-100` on the small icon-button in `SavedMethodsModal` is a hover affordance on a rounded button — both pre-existing and out of scope.

All fetch calls, modal handlers, and API calls are preserved intact. The `gainsPanel` / `historyPanel` JSX variables are defined inside the component body, close over state correctly, and re-evaluate on every render without stale-closure risk.

---

<details>
<summary>Issues (0)</summary>

No blocking concerns remain. All issues from pass 1 have been resolved.

</details>

<details>
<summary>Details</summary>

### Layout — desktop and mobile

Desktop: `hidden md:flex flex-row gap-4 flex-1 overflow-hidden px-6 py-6` wraps two children. Left: `w-[45%] overflow-y-auto custom-scroll` with `style={{ height: "calc(100vh - 130px)" }}`. Right: `flex-1 overflow-y-auto custom-scroll` with the same height. Both have an inner `pb-8` div. This matches the specified requirement exactly.

Mobile: `flex md:hidden` tab bar with two `flex-1` buttons and `activeSection` state initialised to `"gains"`. Conditional rendering (`{activeSection === "gains" && …}`) rather than a `hidden` class keeps both subtrees lean. The `pb-24` on each section correctly clears the bottom nav.

### Design-violation remediation

Pass 1 flagged three issues; pass 2 (`b6a4334`) resolves all three:

- `TxStatusBadge`: raw `<span>` with `bg-green-light / bg-orange-50 / bg-gray-100` → `<Badge variant="light" color="green|orange|gray" radius="xl" size="xs">`. Confirmed fixed.
- `WithdrawHistoryModal.statusBadge`: same span pattern with `bg-green-light / bg-orange-50 / bg-red-50` → `<Badge variant="light" color="green|orange|red" radius="xl" size="xs">`. Confirmed fixed.
- `PointsCard` convert button: `bg-primary/10 hover:bg-primary/20 border border-primary/20` → `bg-surface2 hover:bg-borda border border-borda text-textMain`. Confirmed fixed.

Pre-existing patterns not in scope: `WalletCard` `linear-gradient` (unchanged from base), `bg-red-50` error containers (not icon wrappers), `bg-gray-100` hover affordance on small icon buttons in `SavedMethodsModal`.

### Logic preservation

All five parallel fetches in `fetchData` (`getMyTransactions`, `getAll`, `getEarningsStats`, `getMyEarnings`, `getMyDeclarations`) are unchanged. Modal open/close handlers, `fetchMethods` guards, `handleWithdraw` balance check, and `onDone` callbacks that call `refreshProfile` + `fetchData` are all intact.

</details>

---

<details>
<summary>File map</summary>

- `src/pages/auth/MesGains.tsx` — Two-panel desktop layout, mobile tab toggle, `activeSection` state, stripped `bg` prop from all meta helpers and sub-components, removed colored `div` wrappers from icons throughout; badge spans replaced with Mantine Badge; PointsCard convert button neutralised.

Full diff: `git diff 1731cdc HEAD -- src/pages/auth/MesGains.tsx`

</details>
