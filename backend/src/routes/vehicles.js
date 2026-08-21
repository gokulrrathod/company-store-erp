import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { vehicleSchema, vehicleStatusSchema, insuranceRecordSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';

const router = Router();
router.use(requireAuth);

function renewalStatus(expiryDate) {
  const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'EXPIRED';
  if (days <= 30) return 'EXPIRING';
  return 'ACTIVE';
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT v.*,
       (SELECT expiry_date FROM insurance_records WHERE vehicle_id = v.id ORDER BY expiry_date DESC LIMIT 1) AS latest_insurance_expiry
     FROM vehicles v ORDER BY v.created_at DESC`
  );
  res.json(rows.map((v) => ({
    ...v,
    insurance_status: v.latest_insurance_expiry ? renewalStatus(v.latest_insurance_expiry) : 'MISSING',
  })));
});

router.get('/dashboard', async (req, res) => {
  const { rows: vehicles } = await pool.query(
    `SELECT v.id, v.status,
       (SELECT expiry_date FROM insurance_records WHERE vehicle_id = v.id ORDER BY expiry_date DESC LIMIT 1) AS latest_insurance_expiry
     FROM vehicles v`
  );
  const summary = {
    total_vehicles: vehicles.length,
    active_vehicles: vehicles.filter((v) => v.status === 'ACTIVE').length,
    expiring_30: 0, expiring_60: 0, expiring_90: 0, expired: 0, missing_insurance: 0,
  };
  vehicles.forEach((v) => {
    if (!v.latest_insurance_expiry) { summary.missing_insurance += 1; return; }
    const days = Math.ceil((new Date(v.latest_insurance_expiry) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) summary.expired += 1;
    else if (days <= 30) summary.expiring_30 += 1;
    else if (days <= 60) summary.expiring_60 += 1;
    else if (days <= 90) summary.expiring_90 += 1;
  });
  res.json(summary);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM vehicles WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Vehicle not found' });
  const { rows: insurance } = await pool.query(
    `SELECT * FROM insurance_records WHERE vehicle_id = $1 ORDER BY expiry_date DESC`,
    [req.params.id]
  );
  res.json({
    ...rows[0],
    insurance_records: insurance.map((i) => ({ ...i, renewal_status: renewalStatus(i.expiry_date) })),
  });
});

router.post('/', requireRole(ROLES.TRANSPORT, ROLES.ADMIN), validate(vehicleSchema), async (req, res) => {
  const { vehicle_name, vehicle_type, vehicle_number } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO vehicles (vehicle_name, vehicle_type, vehicle_number, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [vehicle_name, vehicle_type, vehicle_number, req.user.name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Vehicle number already exists', fieldErrors: { vehicle_number: 'This vehicle number is already registered' } });
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/status', requireRole(ROLES.TRANSPORT, ROLES.ADMIN), validate(vehicleStatusSchema), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE vehicles SET status = $1 WHERE id = $2 RETURNING *`,
    [req.body.status, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(rows[0]);
});

router.post('/:id/insurance', requireRole(ROLES.TRANSPORT, ROLES.ADMIN), validate(insuranceRecordSchema), async (req, res) => {
  const { insurance_company_name, policy_number, start_date, expiry_date, premium_amount, document_name } = req.body;
  const { rows: vehicleRows } = await pool.query(`SELECT id FROM vehicles WHERE id = $1`, [req.params.id]);
  if (!vehicleRows.length) return res.status(404).json({ error: 'Vehicle not found' });

  const { rows } = await pool.query(
    `INSERT INTO insurance_records
       (vehicle_id, insurance_company_name, policy_number, start_date, expiry_date, premium_amount, document_name, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.params.id, insurance_company_name, policy_number, start_date, expiry_date, premium_amount, document_name || null, req.user.name]
  );
  res.status(201).json({ ...rows[0], renewal_status: renewalStatus(rows[0].expiry_date) });
});

export default router;
