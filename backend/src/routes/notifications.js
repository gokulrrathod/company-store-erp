import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { ROLES } from '../config/auth.js';

const router = Router();
router.use(requireAuth);

// Each check is scoped to the roles that can actually act on it — Admin sees
// everything. This keeps the bell relevant instead of one generic feed
// everyone ignores.
const CHECKS = [
  {
    key: 'low_stock',
    roles: [ROLES.STORE_MANAGER, ROLES.STORE_EXECUTIVE, ROLES.PURCHASE, ROLES.ADMIN],
    path: '/low-stock',
    icon: 'low_stock',
    query: `SELECT COUNT(*) AS n FROM items WHERE quantity <= reorder_level`,
    text: (n) => `${n} item${n > 1 ? 's' : ''} at or below reorder level`,
  },
  {
    key: 'grn_pending_inspection',
    roles: [ROLES.QUALITY, ROLES.ADMIN],
    path: '/goods-receipt',
    icon: 'inspection',
    query: `SELECT COUNT(*) AS n FROM material_receipts WHERE status = 'PENDING_INSPECTION'`,
    text: (n) => `${n} GRN${n > 1 ? 's' : ''} awaiting your inspection`,
  },
  {
    key: 'grn_pending_approval',
    roles: [ROLES.STORE_MANAGER, ROLES.ADMIN],
    path: '/goods-receipt',
    icon: 'inspection',
    query: `SELECT COUNT(*) AS n FROM material_receipts WHERE status = 'INSPECTED'`,
    text: (n) => `${n} inspected GRN${n > 1 ? 's' : ''} awaiting your approval`,
  },
  {
    key: 'material_requests_pending',
    roles: [ROLES.STORE_MANAGER, ROLES.ADMIN],
    path: '/material-requests',
    icon: 'request',
    query: `SELECT COUNT(*) AS n FROM material_requests WHERE status = 'PENDING'`,
    text: (n) => `${n} material request${n > 1 ? 's' : ''} awaiting your approval`,
  },
  {
    key: 'vendor_pending_purchase_verify',
    roles: [ROLES.PURCHASE, ROLES.ADMIN],
    path: '/vendors',
    icon: 'vendor',
    query: `SELECT COUNT(*) AS n FROM suppliers WHERE vendor_status = 'PENDING_VERIFICATION'`,
    text: (n) => `${n} vendor${n > 1 ? 's' : ''} awaiting your verification`,
  },
  {
    key: 'vendor_pending_finance_verify',
    roles: [ROLES.FINANCE, ROLES.ADMIN],
    path: '/vendors',
    icon: 'vendor',
    query: `SELECT COUNT(*) AS n FROM suppliers WHERE vendor_status = 'PENDING_FINANCE_VERIFICATION'`,
    text: (n) => `${n} vendor${n > 1 ? 's' : ''} awaiting your finance verification`,
  },
  {
    key: 'po_pending_finance_approval',
    roles: [ROLES.FINANCE, ROLES.ADMIN],
    path: '/purchase-orders',
    icon: 'budget',
    query: `SELECT COUNT(*) AS n FROM purchase_orders WHERE budget_status = 'PENDING_FINANCE_APPROVAL'`,
    text: (n) => `${n} PO${n > 1 ? 's' : ''} over budget awaiting your approval`,
  },
  {
    key: 'vendor_pending_management_approval',
    roles: [ROLES.MANAGEMENT, ROLES.ADMIN],
    path: '/vendors',
    icon: 'vendor',
    query: `SELECT COUNT(*) AS n FROM suppliers WHERE vendor_status = 'PENDING_MANAGEMENT_APPROVAL'`,
    text: (n) => `${n} vendor${n > 1 ? 's' : ''} awaiting your final approval`,
  },
  {
    key: 'enquiry_discount_pending',
    roles: [ROLES.MANAGEMENT, ROLES.ADMIN],
    path: '/enquiries',
    icon: 'discount',
    query: `SELECT COUNT(*) AS n FROM enquiries WHERE discount_percent > 2 AND management_approval_status = 'PENDING'`,
    text: (n) => `${n} enquiry discount${n > 1 ? 's' : ''} awaiting your approval`,
  },
  {
    key: 'enquiry_ready_to_confirm',
    roles: [ROLES.SALES, ROLES.ADMIN],
    path: '/enquiries',
    icon: 'sales',
    query: `SELECT COUNT(*) AS n FROM enquiries WHERE status = 'PRICE_APPROVED'`,
    text: (n) => `${n} enquiry${n > 1 ? 'ies' : ''} price-approved, ready to confirm order`,
  },
  {
    key: 'so_ready_for_dispatch',
    roles: [ROLES.DISPATCH, ROLES.ADMIN],
    path: '/sales-orders',
    icon: 'dispatch',
    query: `SELECT COUNT(*) AS n FROM sales_orders WHERE status = 'READY_FOR_DISPATCH' AND balance_amount = 0`,
    text: (n) => `${n} sales order${n > 1 ? 's' : ''} ready for you to dispatch`,
  },
  {
    key: 'so_pending_payment',
    roles: [ROLES.ACCOUNTS, ROLES.ADMIN],
    path: '/sales-orders',
    icon: 'payment',
    query: `SELECT COUNT(*) AS n FROM sales_orders WHERE status = 'READY_FOR_DISPATCH' AND balance_amount > 0`,
    text: (n) => `${n} sales order${n > 1 ? 's' : ''} awaiting balance payment before dispatch`,
  },
  {
    key: 'invoices_outstanding',
    roles: [ROLES.ACCOUNTS, ROLES.ADMIN],
    path: '/invoices',
    icon: 'payment',
    query: `SELECT COUNT(*) AS n FROM invoices WHERE payment_status IN ('PENDING', 'PARTIAL')`,
    text: (n) => `${n} invoice${n > 1 ? 's' : ''} with an outstanding balance`,
  },
  {
    key: 'drawing_pending_check',
    roles: [ROLES.CHECKER, ROLES.ADMIN],
    path: '/drawings',
    icon: 'drawing',
    query: `SELECT COUNT(*) AS n FROM drawings WHERE status = 'UNDER_CHECKING'`,
    text: (n) => `${n} drawing${n > 1 ? 's' : ''} awaiting your check`,
  },
  {
    key: 'drawing_pending_design_head',
    roles: [ROLES.DESIGN_HEAD, ROLES.ADMIN],
    path: '/drawings',
    icon: 'drawing',
    query: `SELECT COUNT(*) AS n FROM drawings WHERE status = 'CHECKER_APPROVED'`,
    text: (n) => `${n} drawing${n > 1 ? 's' : ''} awaiting your approval`,
  },
  {
    key: 'drawing_rework',
    roles: [ROLES.DESIGN_ENGINEER, ROLES.ADMIN],
    path: '/drawings',
    icon: 'drawing',
    query: `SELECT COUNT(*) AS n FROM drawings WHERE status = 'REWORK'`,
    text: (n) => `${n} drawing${n > 1 ? 's' : ''} sent back for rework`,
  },
  {
    key: 'plan_pending_approval',
    roles: [ROLES.PRODUCTION_HEAD, ROLES.ADMIN],
    path: '/production-plans',
    icon: 'production',
    query: `SELECT COUNT(*) AS n FROM production_plans WHERE status = 'DRAFT'`,
    text: (n) => `${n} production plan${n > 1 ? 's' : ''} awaiting your approval`,
  },
  {
    key: 'plan_ready_to_schedule',
    roles: [ROLES.SHOP_FLOOR_ENGINEER, ROLES.ADMIN],
    path: '/production-plans',
    icon: 'production',
    query: `SELECT COUNT(*) AS n FROM production_plans WHERE status = 'APPROVED'`,
    text: (n) => `${n} approved plan${n > 1 ? 's' : ''} ready for activity scheduling`,
  },
  {
    key: 'projects_ready_to_close',
    roles: [ROLES.PROJECT_MANAGER, ROLES.ADMIN],
    path: '/projects',
    icon: 'project',
    query: `SELECT COUNT(*) AS n FROM projects p
             JOIN reconciliations r ON r.project_id = p.id
             WHERE p.status != 'CLOSED' AND r.material_reconciliation_complete AND r.cost_reconciliation_complete`,
    text: (n) => `${n} project${n > 1 ? 's' : ''} fully reconciled, ready to close`,
  },
  {
    key: 'vehicle_insurance_attention',
    roles: [ROLES.TRANSPORT, ROLES.ADMIN],
    path: '/vehicles',
    icon: 'vehicle',
    query: `SELECT COUNT(*) AS n FROM (
              SELECT v.id,
                (SELECT expiry_date FROM insurance_records WHERE vehicle_id = v.id ORDER BY expiry_date DESC LIMIT 1) AS latest_expiry
              FROM vehicles v
            ) t
            WHERE latest_expiry IS NULL OR latest_expiry <= CURRENT_DATE + INTERVAL '30 days'`,
    text: (n) => `${n} vehicle${n > 1 ? 's' : ''} need insurance attention`,
  },
];

router.get('/', async (req, res) => {
  const role = req.user.role;
  const relevant = CHECKS.filter((c) => c.roles.includes(role));

  const results = await Promise.all(
    relevant.map(async (c) => {
      const { rows } = await pool.query(c.query);
      return { ...c, n: Number(rows[0].n) };
    })
  );

  const items = results
    .filter((r) => r.n > 0)
    .map((r) => ({ key: r.key, icon: r.icon, path: r.path, text: r.text(r.n) }));

  res.json(items);
});

export default router;
