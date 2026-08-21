# VMG ERP Demo — Manual Testing Guide (Per User Role)

App: http://localhost:8081 (after `docker compose up -d --build` in `Store POC/`)
Password for every seeded user: **`Password@123`**

Every step below has already been verified automatically by the Playwright e2e suite
(`e2e/tests/*.spec.js`, 14 tests, all passing). This guide is for a human walking the
same paths in a browser.

---

## 1. Admin — `admin@test.com`

Full access to every screen. Use this login to spot-check any module or to fix data
if a manual test run leaves something in a bad state.

- Log in, confirm every sidebar link is visible (Enquiries, Sales Orders, Inventory,
  Storage, Purchase Orders, Vendors, Budgets, Drawings, Production Plans, Projects,
  Vehicles, Invoices & Payments, Goods Receipt, Stock Movements, Material Requests,
  Low Stock Alerts, Rejected Material, Housekeeping, Safety, Reports).

---

## 2. Store Department

### Store Manager — `storemanager@test.com`
1. **Goods Receipt** → open a GRN that's `INSPECTED` → **Approve & Update Inventory**.
   Confirm status flips to `APPROVED` and the item's **Inventory** quantity increases.
2. **Stock Movements** → confirm a new `IN` row appears for the approved GRN.
3. **Material Requests** → open a `PENDING` request → **Approve**. Confirm **Stock
   Movements** shows a new `OUT` row and Inventory quantity decreases.
4. **Low Stock Alerts** → confirm items at/below reorder level are listed.

### Store Executive — `storeexec@test.com`
1. **Goods Receipt** → **New Receipt** (dedicated page, not a dialog).
   - Optionally link a Purchase Order, pick a Supplier, enter Invoice Number.
   - Add a line: pick Item, Batch Number, Qty Received.
   - **Save Receipt** → confirm it lists as `PENDING_INSPECTION`.
2. **Inventory** → confirm read access, no edit controls.
3. **Housekeeping** / **Safety** → log an entry, confirm it appears in the grid.

### Quality — `quality@test.com`
1. **Goods Receipt** → open a `PENDING_INSPECTION` GRN → **Accept** (or reject a line
   with remarks). Confirm status becomes `ACCEPTED`.
2. **Rejected Material** → **New Rejection** → confirm it requires a reason and an
   action taken (Return to Supplier / Scrap / Rework / Replacement).

---

## 3. Sales Department

### Sales — `sales@test.com`
1. **Enquiries** → **New Enquiry**: Customer Name, Mobile Number, Product Requirement,
   Sales Representative → **Create**.
2. Open the enquiry → **Send Quotation** (Amount + Date) → status `QUOTATION SENT`.
3. **Record Negotiation**: Negotiated Price, Discount %.
   - Discount ≤ 2%: goes straight to `PRICE APPROVED`.
   - Discount > 2%: requires Management approval first (see below) before the order
     can be confirmed.
4. **Confirm Order**: Advance Payment, Payment Terms → creates a Sales Order.
5. On the Sales Order page, once Production marks it `PRODUCTION COMPLETED`,
   click **Ready for Dispatch**.

### Management — `management@test.com`
1. **Enquiries** → open one flagged with discount > 2% → **Approve Discount** (or
   **Reject**). Confirm the enquiry cannot be confirmed into an order until approved.
2. **Vendors** → final approval step in the vendor chain (see Purchase section).
3. **Invoices & Payments**, **Vehicles**: read-only — confirm no create/edit buttons
   are visible for this role.

### Production — `production@test.com`
1. On a confirmed Sales Order: **Start** → `IN PRODUCTION`, then **Mark Completed** →
   `PRODUCTION COMPLETED`.
2. **Production Plans**: see Production Department section below.

### Accounts — `accounts@test.com`
1. On a Sales Order marked `READY FOR DISPATCH` with a balance due: enter **Payment
   Amount** → **Record Payment**. Confirm the balance drops to `₹ 0` before Dispatch
   can proceed.
2. See **Accounts Department** section below for Invoices & Payments.
3. See **Project / Civil** section for raising RA Bills.

### Dispatch — `dispatch@test.com`
1. On a Sales Order with `₹ 0` balance: fill the dispatch checklist —
   - **Vehicle** (dropdown, looked up from the Transport Vehicle Master — not free
     text; only `ACTIVE` vehicles appear),
   - Driver Name, Loading Person,
   - check **Material Measured** and **Quality Checked** (both required).
   - **Dispatch** → status `DISPATCHED`.
2. **Mark Delivered** → status `DELIVERED`.

---

## 4. Purchase Department

### Purchase — `purchase@test.com`
1. **Vendors** → **Register Vendor**: Name, Vendor Type, GST Number, PAN Number →
   status starts `PENDING_VERIFICATION`.
2. On that vendor row: **Purchase Verify** → `PENDING_FINANCE_VERIFICATION`.
3. **Purchase Orders** → **New Purchase Order** (dedicated page): PO Number, Supplier,
   Department, at least one line (Item + Quantity) → **Create Purchase Order**.
   - If the PO total exceeds the department's allocated budget, it lands in
     `PENDING_FINANCE_APPROVAL` instead of `OPEN`.

### Finance — `finance@test.com`
1. **Vendors** → on a `PENDING_FINANCE_VERIFICATION` row → **Finance Verify** →
   `PENDING_MANAGEMENT_APPROVAL`.
2. **Budgets** → **Allocate Budget**: Department, Allocated Amount.
3. **Purchase Orders** → on a `PENDING_FINANCE_APPROVAL` PO → **Approve Budget** →
   `FINANCE_APPROVED`.

### Management — `management@test.com`
1. **Vendors** → on a `PENDING_MANAGEMENT_APPROVAL` row → **Approve** (or **Reject**)
   → `ACTIVE` vendors can now be used on Purchase Orders and Invoices.

---

## 5. Design Department

### Design Engineer — `designengineer@test.com`
1. **Drawings** → **New Drawing**: Drawing Number, Drawing Title, Equipment Name;
   check **Requires Customer Approval before release** if applicable → **Create
   Drawing** (dedicated page).
2. On the drawing: **Add BOM Line** (Item No., Description, Quantity).
3. **Submit for Checking** → status `UNDER CHECKING`.

### Checker — `checker@test.com`
1. Open the drawing under `UNDER CHECKING`. **Approve** is disabled until all 13
   checklist items are ticked (Dimensions, Tolerances, Material Grade, Welding
   Details, Shaft Design, Bearing Selection, Gearbox Selection, Structural Load,
   Corrosion Allowance, Interface Matching, Manufacturability, Drawing Standard,
   BOM Accuracy).
2. Tick all 13 → **Approve** → `CHECKER APPROVED`.

### Design Head — `designhead@test.com`
1. On a `CHECKER APPROVED` drawing → **Approve**.
   - If flagged for customer approval: status becomes `AWAITING CUSTOMER APPROVAL`;
     click **Record Customer Approval** → `CUSTOMER APPROVED`.
   - Otherwise it goes straight through.
2. **Release Drawing** → `RELEASED`.
3. **Raise ECN** (Engineering Change Note) against a released drawing: Reason,
   Requested By, New Revision → **Approve** the ECN to bump the drawing's revision.

---

## 6. Production Department

### Production — `production@test.com`
1. **Production Plans** → **New Plan**: Project Reference, Week Number, Start/End
   Date, Planned Quantity → **Create**.
2. Open the plan → confirm **Approve the plan before scheduling activities** message
   and that scheduling is blocked until approved.

### Production Head — `productionhead@test.com`
1. Open a pending plan → **Approve Plan** → `APPROVED`.

### Shop Floor Engineer — `shopfloor@test.com`
1. On an approved plan → **Add Activity**: Equipment Name, Activity, Responsible
   Engineer.
2. Open the activity's schedule detail page.
3. **Status** dropdown → set to `In Progress` → **Save Status**.
4. **Log Stage Inspection**: Inspection Stage, Inspector Name.
5. **Log Rework / Rejection**: Part Name, Quantity Produced, Reason.

---

## 7. Project / Civil Department

### Project Manager — `projectmanager@test.com`
1. **Projects** → **New Project**: Project Name, Client Name, Project Value → confirm
   **Close Project** is disabled before any reconciliation.
2. Once material and cost reconciliation are both marked complete (below): tick
   **Material Reconciliation Complete** and **Cost Reconciliation Complete** →
   **Save Reconciliation** → **Close Project** becomes enabled → click it →
   status `CLOSED`.

### Site Engineer — `siteengineer@test.com`
1. On a project → **Log DPR** (Daily Progress Report): Work Done (required),
   Labour Count, Material/Machinery Used, Issues.
2. **Add Measurement**: Description, Quantity, Rate → adds a Measurement Book entry.

### Accounts — `accounts@test.com`
1. On a project → **Raise RA Bill**: select a **Measurement Entry**, Party Name,
   Amount, Bill Type (Vendor/Client) → **Raise Bill**.
2. Confirm the project detail page's **Excess / Saving** figure is computed live
   from total client-billed amount vs. project value (not manually entered).

---

## 8. Transport Department

### Transport — `transport@test.com`
1. **Vehicles** → **New Vehicle**: Vehicle Name, Vehicle Type, Vehicle Number
   → **Create**.
2. Try registering a second vehicle with the **same Vehicle Number** → confirm it's
   rejected with a clear duplicate error.
3. Open a vehicle → **Add Insurance Record**: Insurance Company, Policy Number,
   Start Date, Expiry Date, Premium Amount.
   - Try an Expiry Date **before** the Start Date → confirm it's rejected.
   - Enter a valid range → confirm the record appears with renewal status `ACTIVE`
     (or `EXPIRING` / `EXPIRED` depending on how close the expiry date is).
4. Confirm the **Vehicles** dashboard tiles (Total, Active, Expiring ≤30/60/90d,
   Expired, Missing Insurance) update accordingly.
5. Toggle a vehicle's status between Active/Inactive — confirm an `INACTIVE` vehicle
   no longer appears in the Sales dispatch vehicle dropdown.

### Management — `management@test.com`
1. **Vehicles** → confirm the page is view-only (no **New Vehicle** button, no
   **Add Insurance Record** button).

---

## 9. Accounts Department

### Accounts — `accounts@test.com`
1. **Invoices & Payments** → **Purchase Invoice** tab.
2. **Purchase Invoice** dialog: Invoice Number, Party Name, pick a **Purchase Order**,
   then pick a **GRN** — only GRNs already `APPROVED` for that PO are selectable
   (the three-way match: PO ↔ Approved GRN ↔ Invoice). Enter Taxable Amount →
   **Book Invoice**.
   - Try booking without a GRN selected → confirm the form blocks submission
     ("Select a GRN").
3. **Sales Invoice** tab/dialog: pick a **Sales Order**, enter Taxable Amount →
   **Raise Invoice**.
4. Open an invoice → **Record Payment**: Mode, Reference, Amount.
   - Try entering an amount **greater than the outstanding balance** → confirm it's
     rejected ("exceeds outstanding balance").
   - Enter a valid partial amount → confirm status becomes `PARTIAL`; pay the rest →
     confirm status becomes `PAID`.

### Finance / Management — `finance@test.com` / `management@test.com`
1. **Invoices & Payments** → confirm read access to the invoice list and detail
   pages (reporting/oversight, no payment-recording controls expected here beyond
   what Accounts/Admin can do).

---

## Automated coverage reference

Every flow above is also exercised automatically. To re-run the full suite:

```
cd e2e
npx playwright test --workers=1 --reporter=list
```

Or the single continuous walkthrough that produced the demo video:

```
npx playwright test tests/full-demo.spec.js --workers=1 --reporter=list
```

| Spec file | Covers |
|---|---|
| `store-sop.spec.js` | Store: PO→GRN→Inspection→Approval, Material Requisition, Low Stock |
| `sales-workflow.spec.js` | Sales: Enquiry → ... → Delivered (incl. vehicle-lookup dispatch) |
| `sales-discount-approval.spec.js` | Sales: >2% discount requires Management approval |
| `purchase-workflow.spec.js` | Purchase: Vendor approval chain, Budget/PO escalation |
| `design-workflow.spec.js` | Design: Draft → Checklist → Head → Customer → Released → ECN |
| `production-workflow.spec.js` | Production: Plan → Head Approval → Activity → Inspection → Rework |
| `project-workflow.spec.js` | Project/Civil: DPR → Measurement → RA Bill → Reconciliation-gated Closure |
| `transport-workflow.spec.js` | Transport: Vehicle Master + Insurance history + validation |
| `accounts-workflow.spec.js` | Accounts: three-way match gate + payment balance cap |
