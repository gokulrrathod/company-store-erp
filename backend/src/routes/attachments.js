import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB — generous for drawings/PDFs, still DB-friendly
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE_BYTES } });

const ENTITY_TYPES = [
  'drawing', 'design_input_sheet', 'design_calculation', 'vendor', 'daily_progress_report',
  'insurance_record', 'material_receipt', 'rejected_material', 'invoice',
];

router.get('/', asyncHandler(async (req, res) => {
  const { entity_type, entity_id } = req.query;
  if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type and entity_id are required' });
  const { rows } = await pool.query(
    `SELECT id, entity_type, entity_id, file_name, mime_type, size_bytes, uploaded_by, uploaded_at
     FROM attachments WHERE entity_type = $1 AND entity_id = $2 ORDER BY uploaded_at DESC`,
    [entity_type, entity_id]
  );
  res.json(rows);
}));

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? `File exceeds the ${MAX_SIZE_BYTES / 1024 / 1024}MB limit` : err.message;
      return res.status(400).json({ error: message });
    }
    if (err) return next(err);
    next();
  });
}, asyncHandler(async (req, res) => {
  const { entity_type, entity_id } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!entity_type || !ENTITY_TYPES.includes(entity_type)) return res.status(400).json({ error: 'Invalid entity_type' });
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });

  const { rows } = await pool.query(
    `INSERT INTO attachments (entity_type, entity_id, file_name, mime_type, size_bytes, file_data, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, entity_type, entity_id, file_name, mime_type, size_bytes, uploaded_by, uploaded_at`,
    [entity_type, entity_id, req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer, req.user.name]
  );
  res.status(201).json(rows[0]);
}));

router.get('/:id/download', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT file_name, mime_type, file_data FROM attachments WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Attachment not found' });
  const file = rows[0];
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.file_name)}"`);
  res.send(file.file_data);
}));

export default router;
