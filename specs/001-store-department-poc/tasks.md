# Tasks: Store Department POC

**Input**: `spec.md`, `plan.md` in this directory

**Status**: Retrofit — most tasks below are already implemented and verified; unchecked items are real remaining
work identified during the build (SOP gap analysis + constitution check), not illustrative placeholders.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story from `spec.md` this task belongs to

---

## Phase 1: Setup (Shared Infrastructure) — DONE

- [x] T001 Scaffold `backend/`, `frontend/`, `db/`, `e2e/` per plan.md structure
- [x] T002 [P] Initialize backend (Express, `pg`, `bcryptjs`, `jsonwebtoken`)
- [x] T003 [P] Initialize frontend (Vite + React + MUI + React Router + Axios)
- [x] T004 Docker Compose: postgres + pgadmin + backend + frontend services, DB init via mounted SQL scripts

---

## Phase 2: Foundational — DONE

- [x] T010 `db/schema.sql` — all 13 tables (categories, items, stock_movements, material_requests, users,
      suppliers, purchase_orders, po_lines, material_receipts, receipt_lines, rejected_materials,
      housekeeping_logs, safety_logs)
- [x] T011 `db/seed.sql` — generic seed users (6 roles), suppliers, items, one sample PO
- [x] T012 JWT auth: `POST /api/auth/login`, `requireAuth`/`requireRole` middleware (`backend/src/middleware/auth.js`)
- [x] T013 Frontend `AuthContext` + `ProtectedRoute` + Axios JWT interceptor with 401 auto-logout

---

## Phase 3: User Story 1 - Receive and inspect incoming material (P1) — DONE

- [x] T020 [US1] `POST /api/purchase-orders` (Purchase/Admin) with line items
- [x] T021 [US1] `POST /api/material-receipts` (Store Executive/Manager/Admin) — auto GRN numbering
- [x] T022 [US1] `PATCH /api/material-receipts/:id/lines/:lineId/inspect` (Quality/Admin)
- [x] T023 [US1] `POST /api/material-receipts/:id/approve` (Store Manager/Admin) — transactional stock update +
      Stock IN movement, blocks approval while any line is PENDING
- [x] T024 [US1] Frontend: `PurchaseOrdersPage.jsx`, `GoodsReceiptPage.jsx` (create + inspect + approve dialog)
- [x] T025 [US1] Playwright: full PO→GRN→Inspect→Approve→inventory-verified flow
      (`e2e/tests/store-sop.spec.js`)

---

## Phase 4: User Story 2 - Request and issue material (P1) — DONE

- [x] T030 [US2] `POST /api/material-requests` — auto requisition numbering, department/purpose fields
- [x] T031 [US2] `PATCH /api/material-requests/:id/status` (Store Manager/Admin) — transactional stock deduction,
      quantity_issued/balance_stock capture, Stock OUT movement, row-lock against double-approval
- [x] T032 [US2] Frontend: `MaterialRequestsPage.jsx`
- [x] T033 [US2] Playwright: requisition→approval→inventory-deducted flow

---

## Phase 5: User Story 3 - Monitor stock health & non-conformance (P2) — DONE

- [x] T040 [US3] `GET /api/dashboard/summary` — stock valuation, SKU count, low-stock/rejected/pending counts,
      recent receipts
- [x] T041 [US3] `GET /api/items/low-stock`
- [x] T042 [US3] `POST /api/rejected-materials` (Quality/Store Manager/Admin) — auto rejection numbering
- [x] T043 [US3] Frontend: `DashboardPage.jsx`, `LowStockPage.jsx`, `RejectedMaterialPage.jsx`
- [ ] T044 [US3] **Playwright coverage for Dashboard, Rejected Material** — currently only manually
      screenshot-verified, not in the automated suite (constitution Principle V gap)

---

## Phase 6: User Story 4 - Role-appropriate access (P1) — DONE

- [x] T050 [US4] Role-filtered sidebar nav (`Sidebar.jsx`)
- [x] T051 [US4] `requireRole` on every write endpoint across all route files
- [x] T052 [US4] Playwright: role-based nav visibility test

---

## Phase 7: Additional modules built beyond the four core stories — DONE (functionally), PARTIAL (tests)

- [x] T060 Housekeeping: `POST/GET /api/housekeeping`, `HousekeepingPage.jsx`
- [ ] T061 **Playwright coverage for Housekeeping** — not yet automated
- [x] T062 Safety: `POST/GET/PATCH /api/safety`, `SafetyPage.jsx` (open→close workflow)
- [ ] T063 **Playwright coverage for Safety** — not yet automated

---

## Phase 8: Visual restyle — DONE

- [x] T070 Theme: indigo primary, slate-900 sidebar, white header, system font stack (no third-party font CDN)
- [x] T071 Removed redundant `secondary` palette; normalized `color="secondary"` → `color="primary"` project-wide
- [x] T072 Recorded final demo video in real Chrome (`e2e/demo-videos/store-sop-final-restyle-demo.webm`)

---

## Remaining Work (not started — real gaps against the SOP, not placeholders)

- [ ] T080 SOP Module 2: dedicated Storage/Master-Data CRUD page (add/edit item with warehouse/rack/bin, min/max,
      FIFO/FEFO — fields exist in DB, no standalone management UI yet)
- [ ] T081 SOP Module 11: formal report exports (Stock Ledger, FIFO Report, Batch-wise Stock Report, Supplier-wise
      Receipt Report, Department-wise Consumption Report) — only list views + Dashboard summary exist today
- [ ] T082 SOP Module 2: Barcode/QR support — explicitly out of scope per spec.md Assumptions, revisit if approved
      for real project
- [ ] T083 Photo upload on GRN and Housekeeping entries — explicitly out of scope per spec.md Assumptions
- [ ] T084 Close the test-coverage gap: T044, T061, T063
- [ ] T085 Decide fate of extension-only fields not in the SOP text (`unit_rate`/valuation, incident `severity`/
      `zone`) — keep as documented extensions (current state) or formally propose as constitution amendments if
      this becomes a real project
