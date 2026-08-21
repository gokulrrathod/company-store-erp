# Feature Specification: Store Department POC

**Feature Branch**: `001-store-department-poc`

**Created**: 2026-08-20

**Status**: Retrofitted baseline (documents work already built and verified)

**Input**: Digitize the VMG Industries Store Department per `Docs/6 Store Department SOP.docx`, as a design/tech-stack
proof of concept for stakeholder review before commissioning the real project.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive and inspect incoming material (Priority: P1)

A Purchase user raises a Purchase Order against a supplier. A Store Executive records the Material Receipt (GRN)
against that PO with batch and quantity details. A Quality user inspects each received line and marks it
Accepted / Partially Accepted / Rejected. A Store Manager approves the receipt, which updates item inventory and
logs a stock movement — completing the SOP's `PO → Receipt → Inspection → Approval → Store Entry → Inventory
Updated` chain (Modules 1, 9).

**Why this priority**: This is the entry point for all stock in the system — nothing else works without it.

**Independent Test**: Log in as each of the four roles in sequence, complete one GRN end-to-end, and confirm the
item's quantity increased by the accepted amount and a Stock IN row appears in Stock Movements.

**Acceptance Scenarios**:

1. **Given** an open Purchase Order, **When** a Store Executive creates a Material Receipt against it, **Then** the
   receipt is created with status `PENDING_INSPECTION` and a system-generated GRN number.
2. **Given** a receipt pending inspection, **When** Quality marks a line Accepted, **Then** the line's inspection
   status updates and the receipt moves to `INSPECTED` once all lines are inspected.
3. **Given** an inspected receipt, **When** Store Manager approves it, **Then** each non-rejected line's quantity is
   added to the item's stock, a Stock IN movement is logged, and the receipt status becomes `APPROVED`.

---

### User Story 2 - Request and issue material to a department (Priority: P1)

A Production (or other department) user raises a Material Requisition for an item and quantity. A Store Manager
approves or rejects it. On approval, the requested quantity is deducted from stock (Store Issue) and a Stock OUT
movement is logged, completing Module 3's `Department Request → Approval → Store Issue → Inventory Updated` chain.

**Why this priority**: This is the primary way stock leaves the system, mirroring receipt as the two core flows.

**Independent Test**: Submit a requisition as Production, approve it as Store Manager, and confirm inventory
decreased by the issued quantity with a matching Stock OUT entry.

**Acceptance Scenarios**:

1. **Given** sufficient stock, **When** Store Manager approves a pending requisition, **Then** the item's quantity
   decreases by the requested amount and `quantity_issued` / `balance_stock` are recorded on the requisition.
2. **Given** insufficient stock, **When** Store Manager attempts to approve, **Then** the approval is rejected with
   an error and no partial state is left (transactional).

---

### User Story 3 - Monitor stock health and non-conformance (Priority: P2)

A Store Manager views a Dashboard summarizing stock value, low-stock items, pending approvals, and rejected
material counts. Low-stock items surface on a dedicated alert page (Module 4, 10, 13). Quality/Store Manager users
log rejected material with disposal action (Module 5).

**Why this priority**: Necessary for oversight, but the system is usable without it if receipts/issues work.

**Independent Test**: With at least one item at or below its reorder level, confirm it appears on both the
Dashboard's low-stock counter and the Low Stock Alerts page.

**Acceptance Scenarios**:

1. **Given** an item's quantity falls to or below its `reorder_level`, **When** viewing Low Stock Alerts, **Then**
   the item is listed with its current quantity and reorder threshold.
2. **Given** a rejected receipt line, **When** Quality logs a Rejected Material entry with an action taken, **Then**
   it appears in the Rejected Material register with a system-generated rejection number.

---

### User Story 4 - Role-appropriate access (Priority: P1)

Each user sees only the navigation and controls relevant to their role (Admin, Store Manager, Store Executive,
Purchase, Quality, Production), and the backend independently enforces the same restriction on every
state-changing endpoint (Module 8).

**Why this priority**: Without this, the workflow separations in Stories 1–2 have no integrity.

**Independent Test**: Log in as Purchase and confirm Goods Receipt is not in the nav and its create-PO action is
available; attempt the equivalent API call as Production and confirm it is rejected server-side.

**Acceptance Scenarios**:

1. **Given** a logged-in Production user, **When** viewing the sidebar, **Then** Purchase Orders and Goods Receipt
   links are not shown.
2. **Given** a valid JWT for a Production user, **When** calling `POST /api/purchase-orders` directly, **Then** the
   API responds 403 regardless of what the UI shows.

### Edge Cases

- Approving a Material Receipt with any line still `PENDING` inspection must be blocked.
- Approving a Material Requisition twice (already APPROVED/REJECTED) must be blocked, not silently re-applied.
- Concurrent approval attempts on the same requisition must not double-deduct stock (row-level lock via
  `SELECT ... FOR UPDATE`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support JWT-based login for six roles (ADMIN, STORE_MANAGER, STORE_EXECUTIVE, PURCHASE,
  QUALITY, PRODUCTION), matching SOP Module 8.
- **FR-002**: System MUST allow Purchase (or Admin) to create Purchase Orders with one or more line items.
- **FR-003**: System MUST allow Store Executive (or Store Manager/Admin) to record a Material Receipt (GRN) against
  a PO or standalone, with per-line batch number, expiry date, and quantity received.
- **FR-004**: System MUST allow Quality (or Admin) to set each receipt line's inspection status to Accepted,
  Partially Accepted, or Rejected, with remarks and damage details.
- **FR-005**: System MUST allow Store Manager (or Admin) to approve a fully-inspected receipt, atomically updating
  item stock and logging a Stock IN movement per accepted/partially-accepted line.
- **FR-006**: System MUST allow any authenticated user to raise a Material Requisition specifying department, item,
  quantity, and purpose.
- **FR-007**: System MUST allow Store Manager (or Admin) to approve/reject a requisition; approval atomically
  deducts stock, records quantity issued and resulting balance, and logs a Stock OUT movement.
- **FR-008**: System MUST expose a Low Stock Alerts view listing items where quantity ≤ reorder level.
- **FR-009**: System MUST allow Quality/Store Manager/Admin to log Rejected Material entries with a disposal action
  (Return to Supplier, Scrap, Rework, Replacement).
- **FR-010**: System MUST allow Store Executive/Manager/Admin to log Housekeeping checklist activities.
- **FR-011**: System MUST allow Store Executive/Manager/Quality/Admin to log Safety incidents with severity, and
  allow Store Manager/Admin to close them.
- **FR-012**: System MUST provide a Dashboard summarizing total stock valuation, SKU count, low-stock count,
  rejected-material count, pending-inspection count, and pending-requisition count.
- **FR-013**: System MUST reject any state-changing API request from a role not authorized for that action,
  independent of what the calling UI displays.

### Key Entities

- **Item**: A stock-keeping unit — code, name, category, unit, quantity, reserved/damaged/rejected stock,
  minimum/maximum/reorder levels, warehouse/rack/bin location, unit rate.
- **Purchase Order / PO Line**: A supplier order and its requested items/quantities.
- **Material Receipt (GRN) / Receipt Line**: A goods-receipt event and its per-item batch/expiry/quantity/
  inspection detail.
- **Material Request**: A department's requisition for an item, its approval state, and issued quantity/balance.
- **Stock Movement**: An IN/OUT ledger entry tied to a GRN approval or requisition approval.
- **Rejected Material**: A quarantine/disposal record for a rejected receipt line.
- **Housekeeping Log / Safety Log**: Checklist and incident records for store upkeep and compliance.
- **User**: An authenticated actor with exactly one of six roles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete the full receive-to-inventory chain (PO → GRN → Inspect → Approve) in under 5
  minutes across four role switches, as demonstrated in the recorded walkthrough video.
- **SC-002**: 100% of state-changing API endpoints reject requests from unauthorized roles (verified by automated
  test).
- **SC-003**: The Playwright suite (`e2e/tests/store-sop.spec.js`) passes with a freshly reset database, covering
  Modules 3, 4, 8, 9, 10 end-to-end.
- **SC-004**: Every field displayed as "from the SOP" is traceable to specific text in
  `Docs/6 Store Department SOP.docx`; fields that are not are documented as extensions (see gap analysis in
  project conversation history).

## Assumptions

- Single-warehouse, single-currency (₹) deployment; multi-tenant/multi-currency is out of scope for the POC.
- Barcode/QR scanning (mentioned in SOP Module 2) is out of scope for the POC — manual entry only.
- Formal multi-report exports (SOP Module 11: Stock Ledger, FIFO Report, Supplier-wise Receipt Report, etc.) are
  out of scope for the POC; only the Dashboard summary and per-module list views are implemented.
- Photo upload (GRN, Housekeeping) is out of scope for the POC.
- This spec documents the system as already implemented (retrofit), not a forward-looking design; changes to scope
  should be captured as new feature specs, not edits to this baseline.
