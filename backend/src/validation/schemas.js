import { z } from 'zod';

const positiveNumber = z.coerce.number().positive('Must be greater than 0');
const nonNegativeNumber = z.coerce.number().min(0, 'Cannot be negative');
const requiredString = (label, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const optionalString = (max = 500) => z.string().trim().max(max).optional().or(z.literal('')).nullable();

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const itemCreateSchema = z.object({
  code: requiredString('Code', 50),
  name: requiredString('Name', 200),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  unit: requiredString('Unit', 20),
  quantity: nonNegativeNumber.optional(),
  reorder_level: nonNegativeNumber.optional(),
  minimum_stock: nonNegativeNumber.optional(),
  maximum_stock: nonNegativeNumber.nullable().optional(),
  warehouse: optionalString(100),
  rack_number: optionalString(50),
  bin_number: optionalString(50),
  storage_location: optionalString(200),
  unit_rate: nonNegativeNumber.optional(),
}).refine((d) => d.maximum_stock == null || d.maximum_stock >= (d.minimum_stock ?? 0), {
  message: 'Maximum stock must be greater than or equal to minimum stock',
  path: ['maximum_stock'],
});

export const itemUpdateSchema = itemCreateSchema;

export const stockMovementSchema = z.object({
  item_id: z.coerce.number().int().positive('Select an item'),
  type: z.enum(['IN', 'OUT'], { errorMap: () => ({ message: 'Type must be IN or OUT' }) }),
  quantity: positiveNumber,
  reference: optionalString(200),
  remarks: optionalString(500),
});

export const materialRequestSchema = z.object({
  department: requiredString('Department', 100),
  item_id: z.coerce.number().int().positive('Select an item'),
  requested_by: requiredString('Requested by', 100),
  quantity_requested: positiveNumber,
  purpose: optionalString(200),
  remarks: optionalString(500),
  project_id: z.coerce.number().int().positive().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  required_date: optionalString(20),
});

export const materialRequestStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { errorMap: () => ({ message: 'Status must be APPROVED or REJECTED' }) }),
  override_batch_id: z.coerce.number().int().positive().nullable().optional(),
  override_reason: optionalString(300),
});

export const purchaseOrderSchema = z.object({
  supplier_id: z.coerce.number().int().positive('Select a supplier'),
  department: requiredString('Department', 100),
  project_id: z.coerce.number().int().positive().nullable().optional(),
  expected_delivery_date: optionalString(20),
  lines: z.array(z.object({
    item_id: z.coerce.number().int().positive('Select an item'),
    quantity_ordered: positiveNumber,
    mr_id: z.coerce.number().int().positive().nullable().optional(),
  })).min(1, 'Add at least one line item'),
});

export const poAmendSchema = z.object({
  expected_delivery_date: optionalString(20),
  amendment_reason: requiredString('Amendment reason', 500),
});

const receiptLineSchema = z.object({
  item_id: z.coerce.number().int().positive('Select an item'),
  batch_number: optionalString(100),
  expiry_date: z.string().trim().optional().or(z.literal('')).nullable(),
  quantity_ordered: nonNegativeNumber.nullable().optional(),
  quantity_received: positiveNumber,
  unit: optionalString(20),
});

export const materialReceiptSchema = z.object({
  po_id: z.coerce.number().int().positive().nullable().optional(),
  supplier_id: z.coerce.number().int().positive('Select a supplier'),
  invoice_number: optionalString(100),
  lines: z.array(receiptLineSchema).min(1, 'Add at least one received item'),
});

export const inspectLineSchema = z.object({
  inspection_status: z.enum(['ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED'], {
    errorMap: () => ({ message: 'Invalid inspection status' }),
  }),
  quality_remarks: optionalString(500),
  damage_details: optionalString(500),
});

export const rejectedMaterialSchema = z.object({
  supplier_id: z.coerce.number().int().positive().nullable().optional(),
  item_id: z.coerce.number().int().positive('Select an item'),
  batch_number: optionalString(100),
  quantity: positiveNumber,
  reason: requiredString('Reason for rejection', 500),
  qc_remarks: optionalString(500),
  action_taken: z.enum(['RETURN_TO_SUPPLIER', 'SCRAP', 'REWORK', 'REPLACEMENT'], {
    errorMap: () => ({ message: 'Select an action taken' }),
  }),
  disposal_date: z.string().trim().optional().or(z.literal('')).nullable(),
});

export const housekeepingSchema = z.object({
  activity: requiredString('Activity', 200),
  performed_by: requiredString('Performed by', 100),
  verified_by: optionalString(100),
  remarks: optionalString(500),
});

export const safetySchema = z.object({
  category: requiredString('Category', 100),
  zone: optionalString(150),
  reported_by: requiredString('Reported by', 100),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH'], { errorMap: () => ({ message: 'Select a severity' }) }),
  action_taken: optionalString(500),
});

// ===== Sales =====

export const enquirySchema = z.object({
  customer_name: requiredString('Customer name', 200),
  mobile_number: requiredString('Mobile number', 30),
  company_name: optionalString(200),
  site_address: optionalString(500),
  product_requirement: requiredString('Product requirement', 500),
  sales_representative: requiredString('Sales representative', 100),
});

export const quotationSchema = z.object({
  quotation_amount: positiveNumber,
  quotation_date: requiredString('Quotation date', 20),
});

export const negotiateSchema = z.object({
  negotiated_price: positiveNumber,
  discount_percent: nonNegativeNumber.refine((v) => v <= 100, 'Discount cannot exceed 100%'),
  discount_reason: optionalString(300),
}).refine((d) => d.discount_percent === 0 || (d.discount_reason && d.discount_reason.trim().length > 0), {
  message: 'Reason is required when a discount is applied',
  path: ['discount_reason'],
});

export const discountApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { errorMap: () => ({ message: 'Status must be APPROVED or REJECTED' }) }),
});

export const confirmOrderSchema = z.object({
  payment_terms: z.enum(['ADVANCE_50', 'FULL_100'], { errorMap: () => ({ message: 'Select payment terms' }) }),
  advance_payment: positiveNumber,
  expected_dispatch_date: optionalString(20),
  customer_notes: optionalString(500),
});

export const productionStatusSchema = z.object({
  production_status: z.enum(['STARTED', 'IN_PROGRESS', 'COMPLETED'], {
    errorMap: () => ({ message: 'Invalid production status' }),
  }),
});

export const dispatchSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('Select a vehicle'),
  driver_name: requiredString('Driver name', 100),
  loading_person: requiredString('Loading person', 100),
  material_measured: z.boolean().refine((v) => v === true, 'Material must be measured before dispatch'),
  quality_checked: z.boolean().refine((v) => v === true, 'Quality must be checked before dispatch'),
});

export const paymentSchema = z.object({
  amount: positiveNumber,
});

// ===== Purchase =====

export const vendorSchema = z.object({
  name: requiredString('Vendor name', 200),
  contact_person: optionalString(100),
  phone: optionalString(30),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')).nullable(),
  vendor_type: z.enum(['MATERIAL_SUPPLIER', 'SUBCONTRACTOR'], { errorMap: () => ({ message: 'Select a vendor type' }) }),
  vendor_category: optionalString(100),
  gst_number: requiredString('GST number', 20),
  pan_number: requiredString('PAN number', 15),
  bank_account_details: optionalString(300),
});

export const vendorApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { errorMap: () => ({ message: 'Status must be APPROVED or REJECTED' }) }),
});

export const budgetSchema = z.object({
  department: requiredString('Department', 100),
  allocated_amount: nonNegativeNumber,
  project_id: z.coerce.number().int().positive().nullable().optional(),
});

// ===== Design =====

export const drawingSchema = z.object({
  drawing_number: requiredString('Drawing number', 50),
  drawing_title: requiredString('Drawing title', 200),
  project_reference: optionalString(200),
  equipment_name: requiredString('Equipment name', 200),
  scale: optionalString(30),
  material: optionalString(100),
  weight: nonNegativeNumber.nullable().optional(),
  requires_customer_approval: z.boolean().optional(),
  checker: optionalString(100),
  design_head: optionalString(100),
});

export const designCalculationSchema = z.object({
  calculation_date: optionalString(20),
  formula_reference: optionalString(300),
  safety_factor: nonNegativeNumber.nullable().optional(),
  load_calculation: optionalString(2000),
  shaft_calculation: optionalString(2000),
  bearing_calculation: optionalString(2000),
  motor_calculation: optionalString(2000),
  gearbox_calculation: optionalString(2000),
  remarks: optionalString(1000),
});

export const designInputSheetSchema = z.object({
  customer_specification: optionalString(2000),
  process_data: optionalString(2000),
  applicable_standards: optionalString(1000),
  material_specification: optionalString(500),
  corrosion_allowance: nonNegativeNumber.nullable().optional(),
  design_pressure: nonNegativeNumber.nullable().optional(),
  previous_reference_drawing_id: z.coerce.number().int().positive().nullable().optional(),
  design_notes: optionalString(2000),
});

export const designInputSheetStatusSchema = z.object({
  status: z.enum(['DRAFT', 'COMPLETED'], { errorMap: () => ({ message: 'Status must be DRAFT or COMPLETED' }) }),
});

export const checklistSchema = z.object({
  checklist: z.record(z.boolean()),
  checker_remarks: optionalString(500),
  decision: z.enum(['APPROVE', 'REWORK'], { errorMap: () => ({ message: 'Decision must be APPROVE or REWORK' }) }),
});

export const bomLineSchema = z.object({
  item_no: requiredString('Item No.', 50),
  part_number: optionalString(100),
  description: requiredString('Description', 300),
  material: optionalString(100),
  quantity: positiveNumber,
  unit: optionalString(20),
  weight: nonNegativeNumber.nullable().optional(),
});

export const ecnSchema = z.object({
  reason_for_change: requiredString('Reason for change', 500),
  requested_by: requiredString('Requested by', 100),
  remarks: optionalString(500),
  affected_drawings: z.array(z.object({
    drawing_id: z.coerce.number().int().positive('Select a drawing'),
    new_revision: requiredString('New revision', 20),
  })).min(1, 'Select at least one affected drawing'),
});

export const ecnApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { errorMap: () => ({ message: 'Status must be APPROVED or REJECTED' }) }),
});

// ===== Production =====

export const productionPlanSchema = z.object({
  project_reference: requiredString('Project reference', 200),
  week_number: requiredString('Week number', 20),
  start_date: requiredString('Start date', 20),
  end_date: requiredString('End date', 20),
  planned_quantity: positiveNumber,
  planned_completion_date: optionalString(20),
  production_engineer: requiredString('Production engineer', 100),
});

export const scheduleSchema = z.object({
  equipment_name: requiredString('Equipment name', 200),
  activity: requiredString('Activity', 100),
  planned_start_date: optionalString(20),
  planned_end_date: optionalString(20),
  responsible_engineer: requiredString('Responsible engineer', 100),
});

export const scheduleStatusSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'], {
    errorMap: () => ({ message: 'Invalid status' }),
  }),
  delay_reason: optionalString(500),
  actual_start_date: optionalString(20),
  actual_end_date: optionalString(20),
}).refine((d) => d.status !== 'DELAYED' || (d.delay_reason && d.delay_reason.trim().length > 0), {
  message: 'Delay reason is required when status is Delayed',
  path: ['delay_reason'],
});

export const stageInspectionSchema = z.object({
  inspection_stage: z.enum(
    ['GAS_CUTTING', 'GRINDING', 'ROLLING', 'BENDING', 'FIT_UP', 'WELDING', 'FINISHING',
      'TRIAL_ASSEMBLY', 'BLASTING', 'PAINTING', 'FINAL_INSPECTION'],
    { errorMap: () => ({ message: 'Select an inspection stage' }) }
  ),
  inspector_name: requiredString('Inspector name', 100),
  status: z.enum(['OK', 'HOLD', 'REJECT'], { errorMap: () => ({ message: 'Select a status' }) }),
  remarks: optionalString(500),
});

export const reworkRejectionSchema = z.object({
  part_name: requiredString('Part name', 200),
  quantity_produced: nonNegativeNumber,
  rework_qty: nonNegativeNumber,
  rejection_qty: nonNegativeNumber,
  reason: requiredString('Reason', 500),
  corrective_action: optionalString(500),
  responsible_engineer: requiredString('Responsible engineer', 100),
});

export const dailyProductionEntrySchema = z.object({
  entry_date: requiredString('Date', 20),
  shift: requiredString('Shift', 50),
  engineer: requiredString('Engineer', 100),
  planned_qty: positiveNumber,
  actual_qty: nonNegativeNumber,
});

// ===== Resource Allocation (Machinery/Labour shared masters, Recommended Decision #6) =====

export const machineSchema = z.object({
  machine_name: requiredString('Machine name', 200),
  machine_number: requiredString('Machine number', 50),
  machine_type: optionalString(100),
});

export const labourSchema = z.object({
  employee_name: requiredString('Employee name', 200),
  department: requiredString('Department', 100),
  skill: optionalString(100),
});

export const machineAllocationSchema = z.object({
  machine_id: z.coerce.number().int().positive('Select a machine'),
  project_reference: requiredString('Project reference', 200),
  allocated_from: requiredString('Allocated from', 20),
  allocated_to: optionalString(20),
});

export const manpowerAllocationSchema = z.object({
  labour_id: z.coerce.number().int().positive('Select an employee'),
  project_reference: requiredString('Project reference', 200),
  shift: requiredString('Shift', 50),
  assigned_job: requiredString('Assigned job', 200),
  allocated_from: requiredString('Allocated from', 20),
  allocated_to: optionalString(20),
});

export const spaceAllocationSchema = z.object({
  space_name: z.enum(['FABRICATION_BAY', 'PAINTING_BAY', 'ASSEMBLY_AREA'], {
    errorMap: () => ({ message: 'Select a space' }),
  }),
  project_reference: requiredString('Project reference', 200),
  allocated_from: requiredString('Allocated from', 20),
  allocated_to: optionalString(20),
});

// ===== Project / Civil =====

export const projectStatusSchema = z.object({
  status: z.enum(['PLANNING', 'RUNNING', 'HOLD', 'COMPLETED'], { errorMap: () => ({ message: 'Invalid status' }) }),
});

export const projectSchema = z.object({
  project_name: requiredString('Project name', 200),
  client_name: requiredString('Client name', 200),
  site_location: optionalString(300),
  company: z.enum(['VMG_BARAMATI', 'VMG_SUGAR_LLP'], { errorMap: () => ({ message: 'Select a company' }) }),
  project_type: optionalString(100),
  start_date: optionalString(20),
  expected_completion_date: optionalString(20),
  project_value: nonNegativeNumber,
  project_manager: requiredString('Project manager', 100),
  site_engineer: optionalString(100),
});

export const dprSchema = z.object({
  report_date: requiredString('Report date', 20),
  work_done: requiredString('Work done', 1000),
  labour_count: nonNegativeNumber,
  material_used: optionalString(500),
  machinery_used: optionalString(500),
  issues: optionalString(500),
});

export const measurementEntrySchema = z.object({
  description: requiredString('Description', 300),
  quantity: positiveNumber,
  unit: optionalString(20),
  rate: nonNegativeNumber,
  measured_by: requiredString('Measured by', 100),
  measurement_date: requiredString('Measurement date', 20),
});

export const raBillSchema = z.object({
  measurement_entry_id: z.coerce.number().int().positive('Select a measurement entry'),
  bill_type: z.enum(['VENDOR', 'CLIENT'], { errorMap: () => ({ message: 'Select a bill type' }) }),
  party_name: requiredString('Party name', 200),
  amount: positiveNumber,
});

export const reconciliationSchema = z.object({
  material_reconciliation_complete: z.boolean().optional(),
  cost_reconciliation_complete: z.boolean().optional(),
  material_return_note: optionalString(500),
  remarks: optionalString(500),
});

// ===== Civil Execution (Project extension) =====

export const rateChartSchema = z.object({
  work_description: requiredString('Work description', 300),
  unit: requiredString('Unit', 20),
  standard_rate: positiveNumber,
});

export const boqLineSchema = z.object({
  item_no: requiredString('Item no.', 20),
  description: requiredString('Description', 300),
  unit: requiredString('Unit', 20),
  quantity: positiveNumber,
  rate_chart_id: z.coerce.number().int().positive().nullable().optional(),
  rate: positiveNumber,
});

export const quantitySheetLineSchema = z.object({
  description: requiredString('Description', 300),
  unit: requiredString('Unit', 20),
  quantity: positiveNumber,
  remarks: optionalString(500),
});

export const rateAnalysisLineSchema = z.object({
  work_item: requiredString('Work item', 300),
  material_cost: nonNegativeNumber,
  labour_cost: nonNegativeNumber,
  machinery_cost: nonNegativeNumber,
  overhead_percent: nonNegativeNumber,
});

// ===== Transport =====

export const vehicleSchema = z.object({
  vehicle_name: requiredString('Vehicle name', 150),
  vehicle_type: z.enum(['TATA', 'CARRY', 'TRAILER', 'ASHOK_LEYLAND', 'OTHER'], {
    errorMap: () => ({ message: 'Select a vehicle type' }),
  }),
  vehicle_number: requiredString('Vehicle number', 30),
});

export const vehicleStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], { errorMap: () => ({ message: 'Select a status' }) }),
});

export const insuranceRecordSchema = z.object({
  insurance_company_name: requiredString('Insurance company', 150),
  policy_number: requiredString('Policy number', 60),
  start_date: requiredString('Start date', 20),
  expiry_date: requiredString('Expiry date', 20),
  premium_amount: nonNegativeNumber,
  document_name: optionalString(255),
}).refine((data) => new Date(data.expiry_date) > new Date(data.start_date), {
  message: 'Expiry date must be after start date',
  path: ['expiry_date'],
});

// ===== Accounts =====

const invoiceLineSchema = z.object({
  item_id: z.coerce.number().int().positive().nullable().optional(),
  description: requiredString('Description', 300),
  hsn_sac_code: optionalString(20),
  quantity: positiveNumber,
  rate: nonNegativeNumber,
});

export const purchaseInvoiceSchema = z.object({
  party_name: requiredString('Party name', 200),
  gstin: optionalString(20),
  purchase_order_id: z.coerce.number().int().positive('Select a purchase order'),
  material_receipt_id: z.coerce.number().int().positive('Select a GRN'),
  gst_percent: nonNegativeNumber,
  due_date: optionalString(20),
  lines: z.array(invoiceLineSchema).min(1, 'Add at least one line item'),
});

export const salesInvoiceSchema = z.object({
  sales_order_id: z.coerce.number().int().positive('Select a sales order'),
  gstin: optionalString(20),
  gst_percent: nonNegativeNumber,
  due_date: optionalString(20),
  lines: z.array(invoiceLineSchema).min(1, 'Add at least one line item'),
});

export const invoicePaymentSchema = z.object({
  payment_date: optionalString(20),
  mode: z.enum(['NEFT', 'RTGS', 'CHEQUE', 'CASH', 'UPI'], { errorMap: () => ({ message: 'Select a payment mode' }) }),
  bank_name: optionalString(150),
  utr_or_cheque_number: optionalString(80),
  amount_paid: positiveNumber,
});
