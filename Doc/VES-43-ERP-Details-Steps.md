# ERP Details — Steps

Reference: [VES-43](https://nuerotech.atlassian.net/browse/VES-43)

## Overview
Quick-reference steps covering the core VMG ERP workflow, from raising a customer enquiry through to dispatch and invoicing.

## Steps

1. **Enquiry** — Sales creates a new enquiry with customer and product requirement details.
2. **Quotation** — Sales sends a quotation with amount and date; enquiry moves to `QUOTATION_SENT`.
3. **Negotiation** — Negotiated price and discount are recorded; large discounts route to Management for approval.
4. **Order Confirmation** — Once price is approved, the enquiry converts into a confirmed sales order.
5. **Purchase** — Purchase raises indents/POs for materials required to fulfill the order.
6. **Receiving** — Store receives materials against the PO and updates stock.
7. **Issue** — Materials are issued from store to production against the order.
8. **Production** — Production executes the job per plan and records progress.
9. **Dispatch** — Finished goods are dispatched to the customer.
10. **Invoicing** — Invoice is generated and shared with the customer to close out the order.

## Notes
- Each step updates the order/enquiry status so downstream teams know what to do next.
- Approval gates (e.g. discount thresholds) pause the flow until Management action is taken.
