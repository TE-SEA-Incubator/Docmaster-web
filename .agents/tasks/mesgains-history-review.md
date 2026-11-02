# Earnings history with tabs and filter

Backend API and frontend UI for full earnings history with type filtering and pagination.

The change adds a new backend endpoint `/auth/earnings/history` and updates the frontend `EarningsHistoryCard` component to show two tabs: recent earnings (existing list) and full history (new, with filter and pagination). Users can now filter by transaction type (DECLARATION, REFERRAL, MATCH, BONUS, CONVERSION, WITHDRAWAL, WITHDRAWAL_REFUND, ADJUSTMENT) and paginate through results.

**Watch for:** backend page-to-offset conversion missing (confirmed), frontend assumes specific response shape that backend doesn't fully match (confirmed), no error handling if history fetch fails (likely).

**Verdict**: NEEDS_CHANGES

## High-level view

The backend service queries the `earnings_history` table with type and date filters, returning `{ history, total, limit, offset }`. The controller wraps this in `{ success: true, data: result }`, so the full response is `{ success: true, data: { history, total, limit, offset } }`. The frontend expects `data` to be either an array or an object with a `data` field containing the array — this mismatch will cause the history tab to always show "no earnings" even when records exist.

The controller accepts a `page` query param but passes it directly to the service, which expects `offset`. The service then tries to use `filters.page` as an offset value, which breaks pagination — page 2 with limit 10 should show items 10-19, but the service will use offset=2 and show items 2-11.

The history tab only fetches data when first opened (useEffect guards with `pointsHistory.length === 0`). If the user opens the tab, then switches back to recent, then reopens history, no refetch happens — stale data if new transactions were added in the meantime.

<details>
<summary>Issues (3)</summary>

1. **Backend page-to-offset conversion missing** — Controller passes `page` to service but service treats it as `offset`. Page 2 with limit 10 should be offset 10, but backend uses offset 2. Calculate `offset = (page - 1) * limit` in controller before calling service.

2. **Frontend response shape mismatch** — Backend returns `{ success: true, data: { history, total, limit, offset } }` but frontend expects `data.data` to be the array. Line 741 in MesGains.tsx does `raw.data || []` but `raw` is `{ history, total, limit, offset }` so `raw.data` is undefined. Change line 741 to `setPointsHistory(Array.isArray(raw) ? raw : raw.history || raw.data || [])`.

3. **No error feedback when history fetch fails** — If `authService.getEarningsHistory()` throws, the catch block is empty and the component shows a loader forever. Add `setPointsHistoryLoading(false)` in the finally block (already present) but also consider showing an error state or toast when fetch fails.

</details>

<details>
<summary>Details</summary>

## Backend service returns wrong field name

The service returns `{ history, total, limit, offset }`. The controller wraps this as `{ success: true, data: { history, total, limit, offset } }`. The frontend at line 741 checks `raw.data || []` where `raw` is `{ history, total, limit, offset }`, so `raw.data` is undefined and the history tab always shows empty even when records exist.

Fix: change line 741 to `setPointsHistory(Array.isArray(raw) ? raw : raw.history || raw.data || [])`.

## Page vs offset mismatch

The controller passes `filters.page` to the service, but the service reads `filters.offset`. When `offset` is undefined, it defaults to 0, so all pages show the first page of results.

Fix: controller should convert page to offset before calling service:
```typescript
const pageNum = parseInt(page as string, 10);
const limitNum = parseInt(limit as string, 10);
const filters = {
  ...
  offset: (pageNum - 1) * limitNum,
  limit: limitNum,
};
```

## All 8 transaction types present

The Select at lines 809-819 defines all 8 required options: DECLARATION, REFERRAL, MATCH, BONUS, CONVERSION, WITHDRAWAL, WITHDRAWAL_REFUND, ADJUSTMENT.

## No extra Card wrapper in tab content

History tab content (lines 803-878) renders directly: div with padding, Select, transaction list, pagination. No `<Card>` or `<Paper>` wrapper inside the tab panel. The outer `<Paper>` (line 756) wraps the entire component.

## authService.getEarningsHistory called correctly

Line 736 calls `authService.getEarningsHistory({ type: type || undefined, page, limit: 10 })`, matching the new service method added at `src/services/authService.ts:77`.

## Pagination wired correctly

Lines 871-878 render Pagination with `total={Math.ceil(pointsHistoryTotal / 10)}`, `value={pointsHistoryPage}`, and `onChange` that updates state and refetches. Pagination imported from @mantine/core at line 16.

## Design compliance

Icons (line 847) render without background wrappers: `<i className={...} />` with no `bg-*` classes. Borders use `border-borda` (line 756). Select component (line 805) uses `borderColor: '#EAE3D8'` which matches `borderMain` from the design system.

## Build passes and existing functionality preserved

TypeScript build completed successfully. The "recent" tab (lines 769-804) renders the `earningsHistory` prop, preserving the existing earnings list behavior.

</details>

<details>
<summary>File map</summary>

**Backend changes:**
- `server/src/services/auth.service.ts` — added `getEarningsHistory()` method that queries `earnings_history` table with filters
- `server/src/controllers/auth.controller.ts` — added `getEarningsHistory()` controller method
- `server/src/routes/auth.routes.ts` — added GET `/auth/earnings/history` route with Swagger docs

**Frontend changes:**
- `src/services/authService.ts` — added `getEarningsHistory()` method that calls the new endpoint
- `src/pages/auth/MesGains.tsx` — updated `EarningsHistoryCard` to use Mantine Tabs with "recent" and "history" panels

Full diff: `git diff HEAD server/src/services/auth.service.ts server/src/controllers/auth.controller.ts server/src/routes/auth.routes.ts src/services/authService.ts`

</details>
