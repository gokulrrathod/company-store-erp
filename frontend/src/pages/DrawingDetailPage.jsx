import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Stack, Alert, IconButton, Paper, Grid, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox, TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DataTable from '../components/DataTable.jsx';
import AttachmentsPanel from '../components/AttachmentsPanel.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { bomLineSchema, ecnSchema, designInputSheetSchema, designCalculationSchema } from '../validation/schemas.js';
import { CHECKLIST_ITEMS } from '../config/designChecklist.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = {
  DRAFT: 'default', UNDER_CHECKING: 'warning', REWORK: 'error', CHECKER_APPROVED: 'warning',
  DESIGN_HEAD_APPROVED: 'warning', AWAITING_CUSTOMER_APPROVAL: 'warning', CUSTOMER_APPROVED: 'warning',
  RELEASED: 'success',
};

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function DrawingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drawing, setDrawing] = useState(null);
  const [actionError, setActionError] = useState('');
  const [bomOpen, setBomOpen] = useState(false);
  const [ecnOpen, setEcnOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcView, setCalcView] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [checkerRemarks, setCheckerRemarks] = useState('');
  const [allDrawings, setAllDrawings] = useState([]);

  const load = async () => {
    const { data } = await api.get(`/drawings/${id}`);
    setDrawing(data);
    setChecklist(data.checklist || {});
    setCheckerRemarks(data.checker_remarks || '');
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    api.get('/drawings').then((res) => setAllDrawings(res.data)).catch(() => setAllDrawings([]));
  }, []);

  const inputSheetForm = useForm({
    resolver: zodResolver(designInputSheetSchema),
    defaultValues: {
      customer_specification: '', process_data: '', applicable_standards: '', material_specification: '',
      corrosion_allowance: '', design_pressure: '', previous_reference_drawing_id: '', design_notes: '',
    },
  });

  const calcForm = useForm({
    resolver: zodResolver(designCalculationSchema),
    defaultValues: {
      calculation_date: '', formula_reference: '', safety_factor: '',
      load_calculation: '', shaft_calculation: '', bearing_calculation: '', motor_calculation: '', gearbox_calculation: '', remarks: '',
    },
  });

  const bomForm = useForm({
    resolver: zodResolver(bomLineSchema),
    defaultValues: { item_no: '', part_number: '', description: '', material: '', quantity: '', unit: 'pcs', weight: '' },
  });
  const ecnForm = useForm({
    resolver: zodResolver(ecnSchema),
    defaultValues: { reason_for_change: '', requested_by: user?.name || '', remarks: '', affected_drawings: [{ drawing_id: '', new_revision: '' }] },
  });
  const { fields: affectedFields, append: appendAffected, remove: removeAffected } = useFieldArray({ control: ecnForm.control, name: 'affected_drawings' });

  const isEngineer = ['DESIGN_ENGINEER', 'ADMIN'].includes(user?.role);
  const isChecker = ['CHECKER', 'ADMIN'].includes(user?.role);
  const isDesignHead = ['DESIGN_HEAD', 'ADMIN'].includes(user?.role);

  useEffect(() => {
    if (drawing?.input_sheet) {
      const s = drawing.input_sheet;
      inputSheetForm.reset({
        customer_specification: s.customer_specification || '',
        process_data: s.process_data || '',
        applicable_standards: s.applicable_standards || '',
        material_specification: s.material_specification || '',
        corrosion_allowance: s.corrosion_allowance ?? '',
        design_pressure: s.design_pressure ?? '',
        previous_reference_drawing_id: s.previous_reference_drawing_id || '',
        design_notes: s.design_notes || '',
      });
    }
  }, [drawing?.input_sheet]);

  const createInputSheet = async (values) => {
    setActionError('');
    try {
      await api.post(`/drawings/${id}/input-sheet`, values);
      load();
    } catch (err) {
      applyServerErrors(err, inputSheetForm.setError, setActionError);
    }
  };

  const saveInputSheet = async (values) => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/input-sheet`, values);
      load();
    } catch (err) {
      applyServerErrors(err, inputSheetForm.setError, setActionError);
    }
  };

  const markInputSheetCompleted = async () => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/input-sheet/status`, { status: 'COMPLETED' });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to mark completed');
    }
  };

  const submitForChecking = async () => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/submit-for-checking`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to submit');
    }
  };

  const submitChecklist = async (decision) => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/checklist`, { checklist, checker_remarks: checkerRemarks, decision });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to record decision');
    }
  };

  const designHeadApprove = async () => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/design-head-approve`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to approve');
    }
  };

  const customerApprove = async () => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/customer-approve`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to record customer approval');
    }
  };

  const release = async () => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/release`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to release');
    }
  };

  const addBomLine = async (values) => {
    setActionError('');
    try {
      await api.post(`/drawings/${id}/bom-lines`, values);
      setBomOpen(false);
      bomForm.reset({ item_no: '', part_number: '', description: '', material: '', quantity: '', unit: 'pcs', weight: '' });
      load();
    } catch (err) {
      applyServerErrors(err, bomForm.setError, setActionError);
    }
  };

  const addCalculation = async (values) => {
    setActionError('');
    try {
      await api.post(`/drawings/${id}/calculations`, values);
      setCalcOpen(false);
      calcForm.reset({
        calculation_date: '', formula_reference: '', safety_factor: '',
        load_calculation: '', shaft_calculation: '', bearing_calculation: '', motor_calculation: '', gearbox_calculation: '', remarks: '',
      });
      load();
    } catch (err) {
      applyServerErrors(err, calcForm.setError, setActionError);
    }
  };

  const openEcn = () => {
    ecnForm.reset({
      reason_for_change: '', requested_by: user?.name || '', remarks: '',
      affected_drawings: [{ drawing_id: drawing.id, new_revision: '' }],
    });
    setEcnOpen(true);
  };

  const raiseEcn = async (values) => {
    setActionError('');
    try {
      await api.post(`/drawings/${id}/ecns`, values);
      setEcnOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, ecnForm.setError, setActionError);
    }
  };

  const approveEcn = async (ecnId, status) => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/ecns/${ecnId}/approve`, { status });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to record decision');
    }
  };

  if (!drawing) return <Typography>Loading...</Typography>;

  const inputSheetCompleted = drawing.input_sheet?.status === 'COMPLETED';

  const calcColumnDefs = [
    { field: 'calculation_number', headerName: 'Calc No.', minWidth: 130 },
    { field: 'calculation_date', headerName: 'Date', minWidth: 110, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'design_engineer', headerName: 'Engineer', minWidth: 140 },
    { field: 'formula_reference', headerName: 'Formula Ref', minWidth: 160, valueFormatter: (p) => p.value || '—' },
    { field: 'safety_factor', headerName: 'Safety Factor', type: 'numericColumn', minWidth: 130, valueFormatter: (p) => p.value ?? '—' },
    {
      headerName: 'View', minWidth: 70, flex: 0, sortable: false, filter: false,
      cellRenderer: (p) => (
        <IconButton size="small" onClick={() => setCalcView(p.data)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const bomColumnDefs = [
    { field: 'item_no', headerName: 'Item No.', minWidth: 100 },
    { field: 'part_number', headerName: 'Part No.', minWidth: 120, valueFormatter: (p) => p.value || '—' },
    { field: 'description', headerName: 'Description', minWidth: 200 },
    { field: 'material', headerName: 'Material', minWidth: 120, valueFormatter: (p) => p.value || '—' },
    { field: 'quantity', headerName: 'Qty', type: 'numericColumn', minWidth: 80 },
    { field: 'unit', headerName: 'Unit', minWidth: 80 },
  ];

  const revisionColumnDefs = [
    { field: 'revision_number', headerName: 'Revision', minWidth: 100 },
    { field: 'revision_date', headerName: 'Date', minWidth: 110, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'revision_description', headerName: 'Description', minWidth: 220, valueFormatter: (p) => p.value || '—' },
    { field: 'prepared_by', headerName: 'Prepared By', minWidth: 140, valueFormatter: (p) => p.value || '—' },
    { field: 'checked_by', headerName: 'Checked By', minWidth: 140, valueFormatter: (p) => p.value || '—' },
    { field: 'approved_by', headerName: 'Approved By', minWidth: 140, valueFormatter: (p) => p.value || '—' },
  ];

  const ecnColumnDefs = [
    { field: 'ecn_number', headerName: 'ECN No.', minWidth: 130 },
    { field: 'reason_for_change', headerName: 'Reason', minWidth: 220 },
    { field: 'previous_revision', headerName: 'From Rev', minWidth: 100 },
    { field: 'new_revision', headerName: 'To Rev', minWidth: 100 },
    {
      headerName: 'Affected Drawings', minWidth: 220,
      valueGetter: (p) => (p.data.affected_drawings || []).map((a) => `${a.drawing_number} (${a.previous_revision}→${a.new_revision})`).join(', '),
    },
    { field: 'status', headerName: 'Status', minWidth: 110 },
    ...(isDesignHead
      ? [{
          headerName: 'Actions',
          minWidth: 160,
          sortable: false,
          filter: false,
          cellRenderer: (p) =>
            p.data.status === 'PENDING' ? (
              <Stack direction="row" spacing={0.5}>
                <Button size="small" color="success" onClick={() => approveEcn(p.data.id, 'APPROVED')}>Approve</Button>
                <Button size="small" color="error" onClick={() => approveEcn(p.data.id, 'REJECTED')}>Reject</Button>
              </Stack>
            ) : null,
        }]
      : []),
  ];

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate('/drawings')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>{drawing.drawing_number} — {drawing.drawing_title}</Typography>
        <Chip size="small" label={drawing.status.replace(/_/g, ' ')} color={statusColor[drawing.status]} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
        Equipment: {drawing.equipment_name} · Rev {drawing.revision} · Prepared by {drawing.prepared_by}
        {drawing.requires_customer_approval && ' · Requires Customer Approval'}
      </Typography>

      {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}

      <Section title="Design Input Sheet">
        {!drawing.input_sheet ? (
          isEngineer ? (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Documents the basis for downstream Design Calculations — Customer Specification and Applicable Standards are required before this can be marked Completed.
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12}><RHFTextField name="customer_specification" control={inputSheetForm.control} label="Customer Specification" multiline rows={2} /></Grid>
                <Grid item xs={12} sm={6}><RHFTextField name="process_data" control={inputSheetForm.control} label="Process Data" multiline rows={2} /></Grid>
                <Grid item xs={12} sm={6}><RHFTextField name="applicable_standards" control={inputSheetForm.control} label="Applicable Standards" multiline rows={2} /></Grid>
                <Grid item xs={12} sm={6}><RHFTextField name="material_specification" control={inputSheetForm.control} label="Material Specification" /></Grid>
                <Grid item xs={6} sm={3}><RHFTextField name="corrosion_allowance" control={inputSheetForm.control} label="Corrosion Allowance (mm)" type="number" /></Grid>
                <Grid item xs={6} sm={3}><RHFTextField name="design_pressure" control={inputSheetForm.control} label="Design Pressure" type="number" /></Grid>
                <Grid item xs={12} sm={6}>
                  <RHFSelect
                    name="previous_reference_drawing_id" control={inputSheetForm.control} label="Previous Reference Drawing (optional)"
                    options={allDrawings.filter((d) => d.id !== drawing.id)} getLabel={(d) => d.drawing_number} getValue={(d) => d.id}
                  />
                </Grid>
                <Grid item xs={12}><RHFTextField name="design_notes" control={inputSheetForm.control} label="Design Notes" multiline rows={2} /></Grid>
              </Grid>
              <Button variant="contained" sx={{ mt: 2 }} onClick={inputSheetForm.handleSubmit(createInputSheet)}>Create Design Input Sheet</Button>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">No Design Input Sheet created yet.</Typography>
          )
        ) : (
          <>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
              <Chip size="small" label={drawing.input_sheet.status} color={drawing.input_sheet.status === 'COMPLETED' ? 'success' : 'default'} />
            </Stack>
            {isEngineer && drawing.input_sheet.status === 'DRAFT' ? (
              <>
                <Grid container spacing={2}>
                  <Grid item xs={12}><RHFTextField name="customer_specification" control={inputSheetForm.control} label="Customer Specification" multiline rows={2} /></Grid>
                  <Grid item xs={12} sm={6}><RHFTextField name="process_data" control={inputSheetForm.control} label="Process Data" multiline rows={2} /></Grid>
                  <Grid item xs={12} sm={6}><RHFTextField name="applicable_standards" control={inputSheetForm.control} label="Applicable Standards" multiline rows={2} /></Grid>
                  <Grid item xs={12} sm={6}><RHFTextField name="material_specification" control={inputSheetForm.control} label="Material Specification" /></Grid>
                  <Grid item xs={6} sm={3}><RHFTextField name="corrosion_allowance" control={inputSheetForm.control} label="Corrosion Allowance (mm)" type="number" /></Grid>
                  <Grid item xs={6} sm={3}><RHFTextField name="design_pressure" control={inputSheetForm.control} label="Design Pressure" type="number" /></Grid>
                  <Grid item xs={12} sm={6}>
                    <RHFSelect
                      name="previous_reference_drawing_id" control={inputSheetForm.control} label="Previous Reference Drawing (optional)"
                      options={allDrawings.filter((d) => d.id !== drawing.id)} getLabel={(d) => d.drawing_number} getValue={(d) => d.id}
                    />
                  </Grid>
                  <Grid item xs={12}><RHFTextField name="design_notes" control={inputSheetForm.control} label="Design Notes" multiline rows={2} /></Grid>
                </Grid>
                <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                  <Button variant="outlined" onClick={inputSheetForm.handleSubmit(saveInputSheet)}>Save</Button>
                  <Button variant="contained" color="success" onClick={markInputSheetCompleted}>Mark Completed</Button>
                </Stack>
              </>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}><Typography variant="caption" color="text.secondary">Customer Specification</Typography><Typography variant="body2">{drawing.input_sheet.customer_specification || '—'}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Process Data</Typography><Typography variant="body2">{drawing.input_sheet.process_data || '—'}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Applicable Standards</Typography><Typography variant="body2">{drawing.input_sheet.applicable_standards || '—'}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Material Specification</Typography><Typography variant="body2">{drawing.input_sheet.material_specification || '—'}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Corrosion Allowance</Typography><Typography variant="body2">{drawing.input_sheet.corrosion_allowance ?? '—'}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Design Pressure</Typography><Typography variant="body2">{drawing.input_sheet.design_pressure ?? '—'}</Typography></Grid>
                {drawing.input_sheet.previous_reference_drawing_number && (
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Previous Reference Drawing</Typography><Typography variant="body2">{drawing.input_sheet.previous_reference_drawing_number}</Typography></Grid>
                )}
                <Grid item xs={12}><Typography variant="caption" color="text.secondary">Design Notes</Typography><Typography variant="body2">{drawing.input_sheet.design_notes || '—'}</Typography></Grid>
              </Grid>
            )}
            <Box sx={{ mt: 2 }}>
              <AttachmentsPanel entityType="design_input_sheet" entityId={drawing.input_sheet.id} canUpload={isEngineer && drawing.input_sheet.status === 'DRAFT'} />
            </Box>
          </>
        )}
      </Section>

      <Section title="Design Calculations">
        {!inputSheetCompleted ? (
          <Alert severity="warning">Complete the Design Input Sheet above before adding calculations.</Alert>
        ) : (
          <>
            <DataTable
              rowData={drawing.calculations} columnDefs={calcColumnDefs} pagination={false}
              height={Math.max(160, drawing.calculations.length * 56 + 60)} getRowId={(p) => String(p.data.id)}
              emptyMessage="No calculations recorded yet."
            />
            {isEngineer && (
              <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setCalcOpen(true)}>Add Calculation</Button>
            )}
          </>
        )}
      </Section>

      <Section title="Bill of Materials (BOM)">
        <DataTable rowData={drawing.bom_lines} columnDefs={bomColumnDefs} pagination={false} height={Math.max(160, drawing.bom_lines.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No BOM lines yet." />
        {isEngineer && drawing.status !== 'RELEASED' && (
          <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setBomOpen(true)}>Add BOM Line</Button>
        )}
      </Section>

      {['DRAFT', 'REWORK'].includes(drawing.status) && isEngineer && (
        <Section title="Submit for Checking">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {drawing.status === 'REWORK' ? `Checker remarks: ${drawing.checker_remarks || '—'}` : 'Submit this drawing to the Checker.'}
          </Typography>
          <Button variant="contained" onClick={submitForChecking}>Submit for Checking</Button>
        </Section>
      )}

      {drawing.status === 'UNDER_CHECKING' && isChecker && (
        <Section title="Verification Checklist">
          <Grid container spacing={1}>
            {CHECKLIST_ITEMS.map((item) => (
              <Grid item xs={12} sm={6} key={item.key}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!checklist[item.key]}
                      onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                    />
                  }
                  label={item.label}
                />
              </Grid>
            ))}
          </Grid>
          <TextField
            label="Checker Remarks"
            value={checkerRemarks}
            onChange={(e) => setCheckerRemarks(e.target.value)}
            multiline
            rows={2}
            fullWidth
            sx={{ mt: 2 }}
          />
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <Button
              variant="contained" color="success"
              onClick={() => submitChecklist('APPROVE')}
              disabled={!CHECKLIST_ITEMS.every((item) => checklist[item.key])}
            >
              Approve
            </Button>
            <Button variant="outlined" color="warning" onClick={() => submitChecklist('REWORK')}>
              Reject / Rework
            </Button>
          </Stack>
        </Section>
      )}

      {drawing.status === 'CHECKER_APPROVED' && isDesignHead && (
        <Section title="Design Head Approval">
          <Typography variant="body2" sx={{ mb: 1.5 }}>Checked by {drawing.checker}. Approve to proceed.</Typography>
          <Button variant="contained" onClick={designHeadApprove}>Approve</Button>
        </Section>
      )}

      {drawing.status === 'AWAITING_CUSTOMER_APPROVAL' && isDesignHead && (
        <Section title="Customer Approval">
          <Alert severity="info" sx={{ mb: 2 }}>No customer portal in this POC — record the customer's sign-off here.</Alert>
          <Button variant="contained" onClick={customerApprove}>Record Customer Approval</Button>
        </Section>
      )}

      {['DESIGN_HEAD_APPROVED', 'CUSTOMER_APPROVED'].includes(drawing.status) && isDesignHead && (
        <Section title="Final Drawing Release">
          <Button variant="contained" onClick={release}>Release Drawing</Button>
        </Section>
      )}

      {drawing.status === 'RELEASED' && (
        <Section title="Engineering Change Notices (ECN)">
          <DataTable rowData={drawing.ecns} columnDefs={ecnColumnDefs} pagination={false} height={Math.max(160, drawing.ecns.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No ECNs raised." />
          {isDesignHead && (
            <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={openEcn}>Raise ECN</Button>
          )}
        </Section>
      )}

      <Section title="Attachments">
        <AttachmentsPanel entityType="drawing" entityId={drawing.id} canUpload={isEngineer && drawing.status !== 'RELEASED'} />
      </Section>

      <Section title="Revision History">
        <DataTable
          rowData={drawing.revisions || []} columnDefs={revisionColumnDefs} pagination={false}
          height={Math.max(160, (drawing.revisions?.length || 0) * 56 + 60)} getRowId={(p) => String(p.data.id)}
          emptyMessage="No revision history recorded yet."
        />
      </Section>

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="text.secondary">
        Created {new Date(drawing.created_at).toLocaleString()}
      </Typography>

      <Dialog open={bomOpen} onClose={() => setBomOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add BOM Line</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="item_no" control={bomForm.control} label="Item No." required />
            <RHFTextField name="part_number" control={bomForm.control} label="Part Number" />
            <RHFTextField name="description" control={bomForm.control} label="Description" required />
            <RHFTextField name="material" control={bomForm.control} label="Material" />
            <RHFTextField name="quantity" control={bomForm.control} label="Quantity" type="number" required />
            <RHFTextField name="unit" control={bomForm.control} label="Unit" />
            <RHFTextField name="weight" control={bomForm.control} label="Weight (kg)" type="number" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBomOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={bomForm.handleSubmit(addBomLine)}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ecnOpen} onClose={() => setEcnOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Raise Engineering Change Notice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="reason_for_change" control={ecnForm.control} label="Reason for Change" required multiline rows={2} />
            <RHFTextField name="requested_by" control={ecnForm.control} label="Requested By" required />

            <Typography variant="subtitle2" fontWeight={700}>Affected Drawings</Typography>
            {ecnForm.formState.errors.affected_drawings?.root && (
              <Typography variant="caption" color="error">{ecnForm.formState.errors.affected_drawings.root.message}</Typography>
            )}
            {ecnForm.formState.errors.affected_drawings?.message && (
              <Typography variant="caption" color="error">{ecnForm.formState.errors.affected_drawings.message}</Typography>
            )}
            <Stack spacing={1.5}>
              {affectedFields.map((field, idx) => (
                <Stack direction="row" spacing={1} key={field.id} alignItems="flex-start">
                  <RHFSelect
                    name={`affected_drawings.${idx}.drawing_id`} control={ecnForm.control} label="Drawing" required
                    options={allDrawings.filter((d) => d.status === 'RELEASED')} getLabel={(d) => `${d.drawing_number} (Rev ${d.revision})`} getValue={(d) => d.id}
                    sx={{ flex: 2 }}
                  />
                  <RHFTextField name={`affected_drawings.${idx}.new_revision`} control={ecnForm.control} label="New Revision" required sx={{ flex: 1 }} />
                  <IconButton color="error" onClick={() => removeAffected(idx)} disabled={affectedFields.length === 1} sx={{ mt: 1 }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddIcon />} onClick={() => appendAffected({ drawing_id: '', new_revision: '' })} sx={{ alignSelf: 'flex-start' }}>
                Add Affected Drawing
              </Button>
            </Stack>

            <RHFTextField name="remarks" control={ecnForm.control} label="Remarks" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEcnOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={ecnForm.handleSubmit(raiseEcn)}>Raise ECN</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={calcOpen} onClose={() => setCalcOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Design Calculation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="calculation_date" control={calcForm.control} label="Calculation Date" type="date" InputLabelProps={{ shrink: true }} />
            <RHFTextField name="formula_reference" control={calcForm.control} label="Formula Reference" />
            <RHFTextField name="safety_factor" control={calcForm.control} label="Safety Factor" type="number" />
            <RHFTextField name="load_calculation" control={calcForm.control} label="Load Calculation" multiline rows={2} />
            <RHFTextField name="shaft_calculation" control={calcForm.control} label="Shaft Calculation" multiline rows={2} />
            <RHFTextField name="bearing_calculation" control={calcForm.control} label="Bearing Calculation" multiline rows={2} />
            <RHFTextField name="motor_calculation" control={calcForm.control} label="Motor Calculation" multiline rows={2} />
            <RHFTextField name="gearbox_calculation" control={calcForm.control} label="Gearbox Calculation" multiline rows={2} />
            <RHFTextField name="remarks" control={calcForm.control} label="Remarks" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalcOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={calcForm.handleSubmit(addCalculation)}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!calcView} onClose={() => setCalcView(null)} fullWidth maxWidth="sm">
        <DialogTitle>{calcView?.calculation_number}</DialogTitle>
        <DialogContent>
          {calcView && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Box><Typography variant="caption" color="text.secondary">Formula Reference</Typography><Typography variant="body2">{calcView.formula_reference || '—'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Safety Factor</Typography><Typography variant="body2">{calcView.safety_factor ?? '—'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Load Calculation</Typography><Typography variant="body2">{calcView.load_calculation || '—'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Shaft Calculation</Typography><Typography variant="body2">{calcView.shaft_calculation || '—'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Bearing Calculation</Typography><Typography variant="body2">{calcView.bearing_calculation || '—'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Motor Calculation</Typography><Typography variant="body2">{calcView.motor_calculation || '—'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Gearbox Calculation</Typography><Typography variant="body2">{calcView.gearbox_calculation || '—'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Remarks</Typography><Typography variant="body2">{calcView.remarks || '—'}</Typography></Box>
              <AttachmentsPanel entityType="design_calculation" entityId={calcView.id} canUpload={isEngineer} title="Attachments (Excel/PDF)" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalcView(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
