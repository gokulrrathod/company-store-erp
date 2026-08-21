# VMG ERP Node/Postgres Demo — Task Tracker

This tracks progress on the **demo build** in `Store POC/` (Node + Express + PostgreSQL + React/MUI/ag-Grid).
This is a parallel, separate effort from the official `.NET`/Azure ERP analysis in
`.claude/ERP Software Planning/` — that folder is never modified from this project.

Architecture decisions locked in (see `.claude/ERP Software Planning/Demo-Roadmap-Node-Stack.md`):
- One shared Express backend for all departments (no per-module microservices).
- ag-Grid Community for every list/table.
- Large/multi-row forms are dedicated routed pages; small forms are dialogs.
- zod validation mirrored on frontend (react-hook-form) and backend (Express middleware).
- Project folder stays named `Store POC` (rename attempt abandoned — folder was locked).

## Done

All 8 departments built, wired into one Express/Postgres app, and covered by passing Playwright e2e tests.

- [x] **Store** — Inventory, PO→GRN→Inspection→Approval, Stock Movements, Material Requests, Low Stock, Rejected Material, Housekeeping, Safety, Reports
- [x] **Sales** — Enquiry → Quotation → Negotiation → Confirm → Production status → Payment → Dispatch → Delivered
- [x] **Purchase** — Vendor Master (Purchase→Finance→Management approval chain), Purchase Orders, Budgets
- [x] **Design** — Drawings, BOM, sequential approval (Engineer → Checker w/ 13-item checklist → Design Head → Customer → Released), ECN
- [x] **Production** — Weekly Plans → Head Approval → Activities/Schedules → Stage Inspection → Rework log
- [x] **Project / Civil** (merged per Recommended-Decisions) — Projects → DPR → Measurement Book → RA Bills → Reconciliation-gated Closure, live Excess/Saving computation
- [x] **Transport** — Vehicle Master (unique number), Insurance Records history (renewal = new row, never overwritten), 30/60/90-day expiry dashboard, Management read-only
- [x] **Accounts** — Unified Invoice entity (Purchase + Sales), three-way match gate (PO ↔ Approved GRN ↔ Invoice) before invoice booking, Payments with outstanding-balance cap
- [x] Sales dispatch's Vehicle field converted from free text to a lookup into the Transport Vehicle Master (Requirements-Transport.md AC4)
- [x] Full Docker rebuild + health check after every schema change
- [x] e2e regression: 13 tests across `store-sop`, `sales-workflow`, `sales-discount-approval`, `purchase-workflow` (x2), `design-workflow`, `production-workflow`, `project-workflow`, `transport-workflow`, `accounts-workflow` — all passing with `--workers=1`

- [x] **Combined full-demo e2e script** (`e2e/tests/full-demo.spec.js`) — walks all 8 modules end-to-end in one paced, narratable run. Verified: passed first run against a freshly reset Docker stack, ~5 minutes.
- [x] **Demo video recorded** — `Store POC/demo-videos/VMG-ERP-Full-Demo-2026-08-21.webm` (~9 MB, ~5 min, screen-captured via Playwright's built-in video recorder at 1440×900). Covers Store → Sales (incl. Transport vehicle-lookup dispatch) → Purchase → Design → Production → Project/Civil → Transport → Accounts.

### Test-suite fix + re-record (this session, 2026-08-21)

- [x] **Found and fixed a real test-isolation bug**: `full-demo.spec.js` ran alphabetically before `production-`, `project-`, and `purchase-workflow.spec.js` and seeded overlapping fixture data (same vendor/project names), so running the full suite together caused 3 spurious failures (strict-mode duplicate-element violations, not-found errors). Fixed by excluding `full-demo.spec.js` from the default `playwright test` run (`testIgnore` in `e2e/playwright.config.js`, gated on `INCLUDE_DEMO` env var) and adding `npm run test:demo` to run it in isolation. Full 13-test regression now passes cleanly on a freshly reset stack; `full-demo.spec.js` also verified independently.
- [x] **Re-recorded all demo videos** against the current UI (post sidebar/header/notifications/grid-density overhaul) — `demo-videos/2026-08-21-latest/`: one combined narrated walkthrough (`00-full-demo-all-8-modules`) plus 13 individual per-workflow videos (one per regression test, `01`–`13`), giving separate close-up footage of each module instead of only the single combined video. Old stale `VMG-ERP-Full-Demo-2026-08-21.webm` removed.
- [x] **Converted all demo videos from WebM to MP4** (`ffmpeg -c:v libx264 ... -movflags +faststart`) — Playwright's recorder only outputs WebM, which iPhone Safari cannot play at all (no decoder); MP4/H.264 plays everywhere including iOS. Also ~2.5x smaller. WebM originals removed from the repo.
- [x] **Role-access audit against SOP requirements**: cross-checked all 19 roles' sidebar visibility and backend `requireRole` gates against `.claude/ERP Software Planning/Requirements/*.md`. Found and fixed one real violation — Purchase (and every other role) could read BOM lines on Draft/Under-Checking drawings via `GET /drawings`, violating Requirements-Design.md §11 AC5. Now restricted to the Design team (Design Engineer, Checker, Design Head, Admin) only; everyone else sees Released drawings only.
- [x] **Wrote `VMG-ERP-Role-Access-and-Test-Report.docx`** — full role/menu matrix, all 8 module workflows, the complete 51-endpoint permission table, and live test results (56/56 role-gate checks passed against a running backend, both local and Railway).
- [x] **Found and fixed a process-crashing bug** discovered while live-testing role gates: `PATCH /projects/:id/reconciliation` had no try/catch, so a DB error (FK violation) became an unhandled promise rejection that killed the whole Node process — Express 4 doesn't auto-forward async rejections to error middleware. Root cause was systemic (97 async handlers across every route file had the same latent risk), so fixed with a shared `asyncHandler()` wrapper (`backend/src/middleware/asyncHandler.js`) applied to all of them, not just the one handler. Verified: same request now returns a normal 500 and the backend stays up, locally and on Railway. Full 13-test regression still green.

- [x] **Testing-steps document** — `Store POC/TESTING-GUIDE.md`. One section per department (Store, Sales, Purchase, Design, Production, Project/Civil, Transport, Accounts) with sub-sections per role/login, listing exact credentials and step-by-step manual actions, cross-referenced to the matching automated spec file at the bottom.

### UI/UX overhaul (this session)

- [x] **Sidebar rearranged into department sections** (`frontend/src/components/Sidebar.jsx`) — grouped under `NAV_GROUPS` (Overview, Sales, Store, Purchase, Design, Production, Project/Civil, Transport, Accounts, Reports) with `ListSubheader`s, instead of one flat list.
- [x] **Collapsible sidebar** — toggle button collapses to icon-only rail (`SIDEBAR_WIDTH_COLLAPSED = 72`) with tooltips; state persisted in `localStorage` (`useSidebarCollapsed` hook).
- [x] **Header search box** — MUI Autocomplete next to the user chip, searches `NAV_ITEMS` (role-filtered) and navigates on selection.
- [x] **Header notification bell** — now backed by a real backend endpoint (`GET /api/notifications`, `backend/src/routes/notifications.js`) that returns **role-scoped, actionable** items only (e.g. Quality sees GRNs awaiting inspection, Finance sees vendors/POs awaiting their verification, Transport sees vehicles needing insurance attention, Admin sees everything). Previously this was a generic client-side feed everyone saw the same version of — now each of the 18 roles gets a distinct, relevant list. Badge count reflects the filtered list.
- [x] **Fixed-viewport app shell** (`frontend/src/components/NavShell.jsx`) — header, sidebar, and footer are pinned within a `height: 100vh` shell; only the main content column scrolls internally when its own content overflows. Fixed a real bug where the footer sat outside the `100vh` budget, forcing a page-level scrollbar even on short pages.
- [x] Full e2e regression (13 tests) re-verified green after each of the above changes.

### Grid & form density pass (this session)

- [x] **ag-Grid density** (`frontend/src/components/DataTable.jsx`) — `domLayout="autoHeight"` so the grid grows to fit its rows instead of scrolling internally (the page/content column scrolls instead, per the fixed-viewport shell); row height 34px / header 36px (was ~42px default); default page size bumped 20→50.
- [x] **Removed per-column filter icons and column menu clutter** — `defaultColDef` now `filter: false, suppressMenu: true` (sort + resize kept). Quick-filter search boxes (e.g. Inventory) remain the primary search mechanism.
- [x] **Smaller controls globally** — `frontend/src/theme/vmgTheme.js` sets `size: 'small'` as the default for `MuiTextField`, `MuiButton`, `MuiSelect`, `MuiAutocomplete`, `MuiFormControl`, `MuiIconButton`, `MuiChip`, instead of each page opting in individually.
- [x] **Labeled the two placeholder-only inputs** — Inventory's quick-search box and the header's menu-search Autocomplete now have a proper `label` (not just a `placeholder`), matching every other form field in the app.
- [x] Full e2e regression (13 tests) re-verified green after these changes.

## Next Up (requested, not started)

1. **Push to GitHub** (this session) — repo: `https://github.com/gokulrrathod/company-store-erp.git`.
2. **Railway deployment** — feasibility discussed and confirmed workable; user is doing this next.

## Notes for next session

- Seeded test users: `<role>@test.com` / `Password@123` for all (see `db/seed.sql`) — e.g. `admin@test.com`, `transport@test.com`, `accounts@test.com`, `projectmanager@test.com`, `siteengineer@test.com`, etc.
- Standard rebuild cycle after any schema change: `docker compose down -v && docker compose up -d --build`, then `curl http://localhost:4000/api/health` and check `http://localhost:8081`.
- Full regression command: `cd e2e && npx playwright test --workers=1 --reporter=list` (workers>1 causes flaky login timeouts against the single Docker backend — not a real bug, confirmed by isolated re-runs).
- Recurring Postgres gotcha to watch for in any new SQL: `CASE WHEN $1 = 'STRING'` throws error 42P08 unless cast as `$1::varchar`.
