# Implementation Plan: Add Tabs to EarningsHistoryCard in MesGains.tsx

## Context

The EarningsHistoryCard component (around line 730 in `/home/ruxel/Docmaster/Docmaster-web/src/pages/auth/MesGains.tsx`) currently shows a simple list of earnings history. This plan adds a Mantine Tabs component with two tabs:
- **Tab 1 (Gains récents)**: shows the existing `earningsHistory` prop (simple list)
- **Tab 2 (Historique complet)**: shows a filterable, paginated table with full history loaded from `authService.getEarningsHistory()`

**Design Decisions:**
- Using **Ant Design Tabs** (not Mantine Tabs) because the file already imports antd components and the reference implementation in `Portefeuille.tsx` uses Ant Design Tabs (line 500)
- Ant Design Table is already imported and used extensively in the codebase for similar paginated data
- The existing row rendering logic (`getEarningMeta`) will be reused for consistency
- Following AGENTS.md design rules: no colored icon backgrounds, borders use `borderMain`, light variant badges only

## Implementation Steps

- [ ] 1. **Add Ant Design imports and state variables to EarningsHistoryCard**
      
      Add imports for `Tabs`, `Select`, and `Table` from `antd` at the top of the file if not already present (they are imported for modals but need to be available).
      
      Inside the `EarningsHistoryCard` function (around line 730), add state variables:
      - `pointsHistory: EarningsRecord[]` (initialized to `[]`)
      - `pointsHistoryLoading: boolean` (initialized to `false`)
      - `pointsHistoryFilter: string | undefined` (initialized to `undefined`)
      - `pointsHistoryTotal: number` (initialized to `0`)
      - `pointsHistoryPage: number` (initialized to `1`)
      
      Files: `/home/ruxel/Docmaster/Docmaster-web/src/pages/auth/MesGains.tsx`
      
      Verify: Run `npm run dev` and confirm the app compiles without errors. Check the browser console for no runtime errors when visiting `/mes-gains`.

- [ ] 2. **Add fetchPointsHistory function**
      
      Add a `fetchPointsHistory` function inside `EarningsHistoryCard` that:
      - Accepts `type?: string | null` and `page: number = 1` as parameters
      - Sets `pointsHistoryLoading` to `true`
      - Calls `authService.getEarningsHistory({ type: type || undefined, page, limit: 10 })`
      - On success, extracts `data.history` array and `data.total` count, updating `pointsHistory` and `pointsHistoryTotal`
      - On error, logs to console and sets empty array/0 total
      - Sets `pointsHistoryLoading` to `false` in finally block
      - Updates `pointsHistoryPage` state to the current page
      
      Wrap with `useCallback` to avoid recreating on every render.
      
      Files: `/home/ruxel/Docmaster/Docmaster-web/src/pages/auth/MesGains.tsx`
      
      Verify: Add a temporary `useEffect` that calls `fetchPointsHistory()` on mount, then inspect Network tab in browser DevTools to confirm the API call to `/auth/earnings/history` is made and returns data.

- [ ] 3. **Replace the Paper content with Ant Design Tabs component**
      
      Replace the current content inside the `<Paper>` (everything after the header Group) with an Ant Design `<Tabs>` component with two tab items:
      
      - **Tab 1** (`key='recent'`, `label='Gains récents'`): renders the existing Stack with the list of `earningsHistory` entries (the loading/empty/list logic currently in place)
      - **Tab 2** (`key='history'`, `label='Historique complet'`): renders:
        - A `<Space>` wrapper (style `marginBottom: 16`) containing:
          - Ant Design `<Select>` with:
            - `placeholder="Filtrer par type"`
            - `style={{ width: 200 }}`
            - `allowClear={true}`
            - `value={pointsHistoryFilter}`
            - `onChange={(value) => { setPointsHistoryFilter(value); fetchPointsHistory(value, 1); }}`
            - Options: `DECLARATION`, `REFERRAL`, `MATCH`, `BONUS`, `CONVERSION`, `WITHDRAWAL`, `WITHDRAWAL_REFUND`, `ADJUSTMENT` (with French labels matching the pattern in Portefeuille.tsx lines 521-528)
          - Text displaying total: `<Text size="xs" c="dimmed">{pointsHistoryTotal} transaction{pointsHistoryTotal > 1 ? 's' : ''}</Text>` (using Mantine Text for consistency)
        - Ant Design `<Table>` with:
          - `dataSource={pointsHistory}`
          - `rowKey="id"`
          - `loading={pointsHistoryLoading}`
          - Columns matching the existing earnings display (date, description/type, amount with currency badge) - reuse the row rendering pattern from the simple list
          - `pagination={{ current: pointsHistoryPage, pageSize: 10, total: pointsHistoryTotal, onChange: (page) => fetchPointsHistory(pointsHistoryFilter, page) }}`
          - `locale={{ emptyText: t("mesgains_no_earnings") }}`
      
      Add an `onChange` handler to the Tabs that calls `fetchPointsHistory()` when switching to the "history" tab if `pointsHistory.length === 0` (lazy load pattern from Portefeuille.tsx line 503).
      
      Keep the existing Paper wrapper and header unchanged - only replace the body content.
      
      Files: `/home/ruxel/Docmaster/Docmaster-web/src/pages/auth/MesGains.tsx`
      
      Verify: Run `npm run dev`, navigate to `/mes-gains`, verify:
      - The EarningsHistoryCard now shows two tabs
      - "Gains récents" tab shows the existing simple list
      - "Historique complet" tab shows the Select filter and Table
      - Clicking between tabs works without errors
      - The filter Select updates the table when a type is selected
      - Pagination controls appear and work when there are more than 10 entries

- [ ] 4. **Define Table columns with proper rendering**
      
      Inside the "Historique complet" tab content, define the Table columns array following the existing pattern from `getEarningMeta`:
      
      - **Column 1 (Date)**: `dataIndex: "created_at"`, width 140, render using `fmtDate(value)`
      - **Column 2 (Description)**: Custom render that calls `getEarningMeta(record.type, t)` and displays `record.description || meta.label` with icon (`<i className={meta.icon} className={meta.color} />` inline before text)
      - **Column 3 (Montant)**: `dataIndex: "amount"`, width 120, render with conditional styling: if `record.currency === "POINTS"` show gold color and "pts" suffix, else show green color and "XAF" suffix, using the same format as the simple list (e.g., `+{fmtAmount(entry.amount)} {isPoints ? "pts" : "XAF"}`)
      
      Use inline column definition (no useMemo needed since this is a small component).
      
      Files: `/home/ruxel/Docmaster/Docmaster-web/src/pages/auth/MesGains.tsx`
      
      Verify: In the browser, confirm that:
      - All three columns display correctly in the table
      - Icons and colors match the existing simple list style
      - Currency suffixes (pts/XAF) display correctly based on record type
      - Text truncates properly on mobile widths

- [ ] 5. **Style adjustments and responsive behavior**
      
      Add responsive styles to ensure the Tabs component works well on mobile:
      - Add `scroll={{ x: 500 }}` to the Table to enable horizontal scroll on narrow screens
      - Ensure the Select filter stacks properly on mobile (Space direction should remain horizontal but wrap if needed)
      - Test that tab switching works smoothly on both desktop and mobile views
      
      Verify the Tabs styling matches the design system:
      - No colored backgrounds on icons
      - Borders use the default borderMain color (#EAE3D8)
      - Badges use light variant only
      
      Files: `/home/ruxel/Docmaster/Docmaster-web/src/pages/auth/MesGains.tsx`
      
      Verify: Run `npm run dev` and test on:
      - Desktop viewport (1920px): Tabs and table display properly
      - Mobile viewport (375px): Tabs stack, table scrolls horizontally, Select filter remains usable
      - Confirm no colored icon backgrounds appear
      - Confirm all borders use the neutral borderMain color

- [ ] 6. **Add French translations for filter options**
      
      Update the Select options in the "Historique complet" tab to use French labels:
      - `DECLARATION` → "Déclarations"
      - `REFERRAL` → "Parrainages"
      - `MATCH` → "Matchs"
      - `BONUS` → "Bonus"
      - `CONVERSION` → "Conversions"
      - `WITHDRAWAL` → "Retraits"
      - `WITHDRAWAL_REFUND` → "Remboursements"
      - `ADJUSTMENT` → "Ajustements"
      
      These should be hardcoded in the Select options array since they match the pattern in Portefeuille.tsx and don't need i18n keys for this component.
      
      Files: `/home/ruxel/Docmaster/Docmaster-web/src/pages/auth/MesGains.tsx`
      
      Verify: Check that all filter options display in French in the Select dropdown.

- [ ] 7. **Final integration test**
      
      Test the complete flow:
      - Start the dev server with `npm run dev`
      - Log in as a test user with earnings history
      - Navigate to `/mes-gains`
      - Verify "Gains récents" tab shows recent entries
      - Switch to "Historique complet" tab
      - Verify the API call is made and data loads
      - Apply different filters and verify the table updates
      - Test pagination if more than 10 records exist
      - Verify no console errors
      - Test on mobile viewport
      
      Files: N/A (testing only)
      
      Verify: Complete the checklist above. All items should pass without errors.

## Notes

- The existing `earningsHistory` prop continues to work as before in Tab 1
- Tab 2 introduces new state and API calls that are independent and lazy-loaded
- The `getEarningMeta` helper function is reused for consistency
- Ant Design components (Tabs, Table, Select) are already available in the project dependencies
- Design follows AGENTS.md rules: no colored icon backgrounds, neutral borders, light variant badges
