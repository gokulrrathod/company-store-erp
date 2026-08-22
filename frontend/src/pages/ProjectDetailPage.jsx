import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Stack, Alert, IconButton, Paper, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import {
  dprSchema, measurementEntrySchema, raBillSchema, boqLineSchema, quantitySheetLineSchema, rateAnalysisLineSchema,
} from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = { PLANNING: 'default', RUNNING: 'warning', HOLD: 'error', COMPLETED: 'success', CLOSED: 'success' };
const BILL_TYPES = [{ value: 'VENDOR', label: 'Vendor' }, { value: 'CLIENT', label: 'Client' }];

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [actionError, setActionError] = useState('');
  const [dprOpen, setDprOpen] = useState(false);
  const [mbOpen, setMbOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [recon, setRecon] = useState({ material_reconciliation_complete: false, cost_reconciliation_complete: false, material_return_note: '', remarks: '' });
  const [rateCharts, setRateCharts] = useState([]);
  const [boqOpen, setBoqOpen] = useState(false);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [rateAnalysisOpen, setRateAnalysisOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/projects/${id}`);
    setProject(data);
    if (data.reconciliation) {
      setRecon({
        material_reconciliation_complete: data.reconciliation.material_reconciliation_complete,
        cost_reconciliation_complete: data.reconciliation.cost_reconciliation_complete,
        material_return_note: data.reconciliation.material_return_note || '',
        remarks: data.reconciliation.remarks || '',
      });
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    api.get('/rate-charts').then((res) => setRateCharts(res.data)).catch(() => setRateCharts([]));
  }, []);

  const dprForm = useForm({
    resolver: zodResolver(dprSchema),
    defaultValues: { report_date: new Date().toISOString().slice(0, 10), work_done: '', labour_count: '', material_used: '', machinery_used: '', issues: '' },
  });
  const mbForm = useForm({
    resolver: zodResolver(measurementEntrySchema),
    defaultValues: { description: '', quantity: '', unit: 'unit', rate: '', measured_by: user?.name || '', measurement_date: new Date().toISOString().slice(0, 10) },
  });
  const billForm = useForm({
    resolver: zodResolver(raBillSchema),
    defaultValues: { measurement_entry_id: '', bill_type: 'CLIENT', party_name: '', amount: '' },
  });
  const boqForm = useForm({
    resolver: zodResolver(boqLineSchema),
    defaultValues: { item_no: '', description: '', unit: '', quantity: '', rate_chart_id: '', rate: '' },
  });
  const qtyForm = useForm({
    resolver: zodResolver(quantitySheetLineSchema),
    defaultValues: { description: '', unit: '', quantity: '', remarks: '' },
  });
  const rateAnalysisForm = useForm({
    resolver: zodResolver(rateAnalysisLineSchema),
    defaultValues: { work_item: '', material_cost: '', labour_cost: '', machinery_cost: '', overhead_percent: '' },
  });

  const isProjectManager = ['PROJECT_MANAGER', 'ADMIN'].includes(user?.role);
  const isSiteEngineer = ['SITE_ENGINEER', 'PROJECT_MANAGER', 'ADMIN'].includes(user?.role);
  const isAccounts = ['ACCOUNTS', 'ADMIN'].includes(user?.role);
  const canReconcile = ['PROJECT_MANAGER', 'ACCOUNTS', 'ADMIN'].includes(user?.role);

  const updateStatus = async (status) => {
    setActionError('');
    try {
      await api.patch(`/projects/${id}/status`, { status });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const submitDpr = async (values) => {
    setActionError('');
    try {
      await api.post(`/projects/${id}/dpr`, values);
      setDprOpen(false);
      dprForm.reset({ report_date: new Date().toISOString().slice(0, 10), work_done: '', labour_count: '', material_used: '', machinery_used: '', issues: '' });
      load();
    } catch (err) {
      applyServerErrors(err, dprForm.setError, setActionError);
    }
  };

  const submitMb = async (values) => {
    setActionError('');
    try {
      await api.post(`/projects/${id}/measurement-entries`, values);
      setMbOpen(false);
      mbForm.reset({ description: '', quantity: '', unit: 'unit', rate: '', measured_by: user?.name || '', measurement_date: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) {
      applyServerErrors(err, mbForm.setError, setActionError);
    }
  };

  const submitBill = async (values) => {
    setActionError('');
    try {
      await api.post(`/projects/${id}/ra-bills`, values);
      setBillOpen(false);
      billForm.reset({ measurement_entry_id: '', bill_type: 'CLIENT', party_name: '', amount: '' });
      load();
    } catch (err) {
      applyServerErrors(err, billForm.setError, setActionError);
    }
  };

  const saveReconciliation = async () => {
    setActionError('');
    try {
      await api.patch(`/projects/${id}/reconciliation`, recon);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to save reconciliation');
    }
  };

  const createCivilExecution = async () => {
    setActionError('');
    try {
      await api.post(`/projects/${id}/civil-execution`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to create Civil Execution record');
    }
  };

  const addBoqLine = async (values) => {
    setActionError('');
    try {
      await api.post(`/projects/${id}/civil-execution/boq-lines`, values);
      setBoqOpen(false);
      boqForm.reset({ item_no: '', description: '', unit: '', quantity: '', rate_chart_id: '', rate: '' });
      load();
    } catch (err) {
      applyServerErrors(err, boqForm.setError, setActionError);
    }
  };

  const addQuantitySheetLine = async (values) => {
    setActionError('');
    try {
      await api.post(`/projects/${id}/civil-execution/quantity-sheet-lines`, values);
      setQtyOpen(false);
      qtyForm.reset({ description: '', unit: '', quantity: '', remarks: '' });
      load();
    } catch (err) {
      applyServerErrors(err, qtyForm.setError, setActionError);
    }
  };

  const addRateAnalysisLine = async (values) => {
    setActionError('');
    try {
      await api.post(`/projects/${id}/civil-execution/rate-analysis-lines`, values);
      setRateAnalysisOpen(false);
      rateAnalysisForm.reset({ work_item: '', material_cost: '', labour_cost: '', machinery_cost: '', overhead_percent: '' });
      load();
    } catch (err) {
      applyServerErrors(err, rateAnalysisForm.setError, setActionError);
    }
  };

  const closeProject = async () => {
    setActionError('');
    try {
      await api.post(`/projects/${id}/close`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to close project');
    }
  };

  if (!project) return <Typography>Loading...</Typography>;

  const dprColumnDefs = [
    { field: 'report_date', headerName: 'Date', minWidth: 110, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'work_done', headerName: 'Work Done', minWidth: 220 },
    { field: 'labour_count', headerName: 'Labour', type: 'numericColumn', minWidth: 90 },
    { field: 'submitted_by', headerName: 'Submitted By', minWidth: 140 },
  ];
  const mbColumnDefs = [
    { field: 'description', headerName: 'Description', minWidth: 200 },
    { field: 'quantity', headerName: 'Qty', type: 'numericColumn', minWidth: 90 },
    { field: 'unit', headerName: 'Unit', minWidth: 80 },
    { field: 'rate', headerName: 'Rate', type: 'numericColumn', minWidth: 100, valueFormatter: (p) => `₹ ${p.value}` },
    { field: 'measured_by', headerName: 'Measured By', minWidth: 140 },
  ];
  const billColumnDefs = [
    { field: 'bill_number', headerName: 'Bill No.', minWidth: 120 },
    { field: 'bill_type', headerName: 'Type', minWidth: 100 },
    { field: 'party_name', headerName: 'Party', minWidth: 160 },
    { field: 'amount', headerName: 'Amount', type: 'numericColumn', minWidth: 120, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'status', headerName: 'Status', minWidth: 100 },
  ];

  const boqColumnDefs = [
    { field: 'item_no', headerName: 'Item No.', minWidth: 90 },
    { field: 'description', headerName: 'Description', minWidth: 200 },
    { field: 'unit', headerName: 'Unit', minWidth: 80 },
    { field: 'quantity', headerName: 'Qty', type: 'numericColumn', minWidth: 90 },
    { field: 'rate', headerName: 'Rate', type: 'numericColumn', minWidth: 100, valueFormatter: (p) => `₹ ${p.value}` },
    { field: 'amount', headerName: 'Amount', type: 'numericColumn', minWidth: 120, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
  ];
  const qtyColumnDefs = [
    { field: 'description', headerName: 'Description', minWidth: 200 },
    { field: 'unit', headerName: 'Unit', minWidth: 80 },
    { field: 'quantity', headerName: 'Qty', type: 'numericColumn', minWidth: 90 },
    { field: 'remarks', headerName: 'Remarks', minWidth: 180, valueFormatter: (p) => p.value || '—' },
  ];
  const rateAnalysisColumnDefs = [
    { field: 'work_item', headerName: 'Work Item', minWidth: 180 },
    { field: 'material_cost', headerName: 'Material', type: 'numericColumn', minWidth: 100 },
    { field: 'labour_cost', headerName: 'Labour', type: 'numericColumn', minWidth: 100 },
    { field: 'machinery_cost', headerName: 'Machinery', type: 'numericColumn', minWidth: 100 },
    { field: 'overhead_percent', headerName: 'Overhead %', type: 'numericColumn', minWidth: 100 },
    { field: 'computed_rate', headerName: 'Computed Rate', type: 'numericColumn', minWidth: 130, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
  ];

  const canClose = recon.material_reconciliation_complete && recon.cost_reconciliation_complete && project.status !== 'CLOSED';

  return (
    <Box sx={{ maxWidth: 950 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate('/projects')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>{project.project_name}</Typography>
        <Chip size="small" label={project.status} color={statusColor[project.status]} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
        Client: {project.client_name} · {project.company === 'VMG_BARAMATI' ? 'VMG Baramati' : 'VMG Sugar LLP'} · PM: {project.project_manager}
      </Typography>

      {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}

      {isProjectManager && project.status !== 'CLOSED' && (
        <Section title="Project Status">
          <Stack direction="row" spacing={1.5}>
            {['PLANNING', 'RUNNING', 'HOLD', 'COMPLETED'].map((s) => (
              <Button key={s} variant={project.status === s ? 'contained' : 'outlined'} size="small" onClick={() => updateStatus(s)}>{s}</Button>
            ))}
          </Stack>
        </Section>
      )}

      <Section title="Excess / Saving (system-computed)">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Project Value</Typography>
            <Typography variant="h6">₹ {Number(project.excess_saving.project_value).toLocaleString('en-IN')}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Total Client Billed</Typography>
            <Typography variant="h6">₹ {Number(project.excess_saving.total_client_billed).toLocaleString('en-IN')}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Variance</Typography>
            <Typography variant="h6">
              <Chip
                label={`${project.excess_saving.flag} (₹ ${Math.abs(project.excess_saving.variance).toLocaleString('en-IN')})`}
                color={project.excess_saving.flag === 'EXCESS' ? 'error' : project.excess_saving.flag === 'SAVING' ? 'success' : 'default'}
              />
            </Typography>
          </Grid>
        </Grid>
      </Section>

      <Section title="Civil Execution">
        {!project.civil_execution ? (
          isProjectManager ? (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Civil-specific extension of this project — BOQ, Quantity Sheet, and Rate Analysis. Estimated Cost is computed automatically from the BOQ lines.
              </Alert>
              <Button variant="contained" onClick={createCivilExecution}>Create Civil Execution Record</Button>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">No Civil Execution record created yet.</Typography>
          )
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Estimated Cost (from BOQ): <strong>₹ {Number(project.civil_execution.estimated_cost).toLocaleString('en-IN')}</strong>
            </Typography>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>Bill of Quantities (BOQ)</Typography>
            <DataTable rowData={project.civil_execution.boq_lines} columnDefs={boqColumnDefs} pagination={false} height={Math.max(160, project.civil_execution.boq_lines.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No BOQ lines yet." />
            {isProjectManager && <Button startIcon={<AddIcon />} sx={{ mt: 1, mb: 2 }} onClick={() => setBoqOpen(true)}>Add BOQ Line</Button>}

            <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Quantity Sheet</Typography>
            <DataTable rowData={project.civil_execution.quantity_sheet_lines} columnDefs={qtyColumnDefs} pagination={false} height={Math.max(160, project.civil_execution.quantity_sheet_lines.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No quantity sheet lines yet." />
            {isProjectManager && <Button startIcon={<AddIcon />} sx={{ mt: 1, mb: 2 }} onClick={() => setQtyOpen(true)}>Add Quantity Sheet Line</Button>}

            <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Rate Analysis</Typography>
            <DataTable rowData={project.civil_execution.rate_analysis_lines} columnDefs={rateAnalysisColumnDefs} pagination={false} height={Math.max(160, project.civil_execution.rate_analysis_lines.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No rate analysis lines yet." />
            {isProjectManager && <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setRateAnalysisOpen(true)}>Add Rate Analysis Line</Button>}
          </>
        )}
      </Section>

      <Section title="Daily Progress Reports">
        <DataTable rowData={project.daily_progress_reports} columnDefs={dprColumnDefs} pagination={false} height={Math.max(160, project.daily_progress_reports.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No DPR entries yet." />
        {isSiteEngineer && <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setDprOpen(true)}>Log DPR</Button>}
      </Section>

      <Section title="Measurement Book">
        <DataTable rowData={project.measurement_entries} columnDefs={mbColumnDefs} pagination={false} height={Math.max(160, project.measurement_entries.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No measurement entries yet." />
        {isSiteEngineer && <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setMbOpen(true)}>Add Measurement</Button>}
      </Section>

      <Section title="RA Bills">
        <DataTable rowData={project.ra_bills} columnDefs={billColumnDefs} pagination={false} height={Math.max(160, project.ra_bills.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No RA bills yet." />
        {isAccounts && (
          <Button
            startIcon={<AddIcon />} sx={{ mt: 1.5 }}
            onClick={() => setBillOpen(true)}
            disabled={project.measurement_entries.length === 0}
          >
            Raise RA Bill
          </Button>
        )}
      </Section>

      {canReconcile && (
        <Section title="Reconciliation (required before Project Closure)">
          <FormControlLabel
            control={<Checkbox checked={recon.material_reconciliation_complete} onChange={(e) => setRecon({ ...recon, material_reconciliation_complete: e.target.checked })} />}
            label="Material Reconciliation Complete"
          />
          <FormControlLabel
            control={<Checkbox checked={recon.cost_reconciliation_complete} onChange={(e) => setRecon({ ...recon, cost_reconciliation_complete: e.target.checked })} />}
            label="Cost Reconciliation Complete"
          />
          <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
            <Button variant="outlined" onClick={saveReconciliation}>Save Reconciliation</Button>
            {isProjectManager && (
              <Button variant="contained" color="success" onClick={closeProject} disabled={!canClose}>
                Close Project
              </Button>
            )}
          </Stack>
        </Section>
      )}

      <Dialog open={dprOpen} onClose={() => setDprOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Log Daily Progress Report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="report_date" control={dprForm.control} label="Report Date" type="date" required InputLabelProps={{ shrink: true }} />
            <RHFTextField name="work_done" control={dprForm.control} label="Work Done" required multiline rows={2} />
            <RHFTextField name="labour_count" control={dprForm.control} label="Labour Count" type="number" />
            <RHFTextField name="material_used" control={dprForm.control} label="Material Used" />
            <RHFTextField name="machinery_used" control={dprForm.control} label="Machinery Used" />
            <RHFTextField name="issues" control={dprForm.control} label="Issues" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDprOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={dprForm.handleSubmit(submitDpr)}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mbOpen} onClose={() => setMbOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Measurement Book Entry</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="description" control={mbForm.control} label="Description" required />
            <RHFTextField name="quantity" control={mbForm.control} label="Quantity" type="number" required />
            <RHFTextField name="unit" control={mbForm.control} label="Unit" />
            <RHFTextField name="rate" control={mbForm.control} label="Rate (₹)" type="number" />
            <RHFTextField name="measured_by" control={mbForm.control} label="Measured By" required />
            <RHFTextField name="measurement_date" control={mbForm.control} label="Measurement Date" type="date" required InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMbOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={mbForm.handleSubmit(submitMb)}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={billOpen} onClose={() => setBillOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Raise RA Bill</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFSelect
              name="measurement_entry_id" control={billForm.control} label="Measurement Entry" required
              options={project.measurement_entries} getLabel={(m) => `${m.description} (${m.quantity} ${m.unit})`} getValue={(m) => m.id}
            />
            <RHFSelect name="bill_type" control={billForm.control} label="Bill Type" required options={BILL_TYPES} getLabel={(b) => b.label} getValue={(b) => b.value} />
            <RHFTextField name="party_name" control={billForm.control} label="Party Name" required />
            <RHFTextField name="amount" control={billForm.control} label="Amount (₹)" type="number" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBillOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={billForm.handleSubmit(submitBill)}>Raise Bill</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={boqOpen} onClose={() => setBoqOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add BOQ Line</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="item_no" control={boqForm.control} label="Item No." required />
            <RHFTextField name="description" control={boqForm.control} label="Description" required />
            <RHFTextField name="unit" control={boqForm.control} label="Unit" required />
            <RHFTextField name="quantity" control={boqForm.control} label="Quantity" type="number" required />
            <RHFSelect
              name="rate_chart_id" control={boqForm.control} label="Rate Chart (optional)"
              options={rateCharts} getLabel={(r) => `${r.work_description} — ₹${r.standard_rate}/${r.unit}`} getValue={(r) => r.id}
              onValueChange={(value, option) => { if (option) boqForm.setValue('rate', option.standard_rate); }}
            />
            <RHFTextField name="rate" control={boqForm.control} label="Rate (₹)" type="number" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBoqOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={boqForm.handleSubmit(addBoqLine)}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={qtyOpen} onClose={() => setQtyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Quantity Sheet Line</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="description" control={qtyForm.control} label="Description" required />
            <RHFTextField name="unit" control={qtyForm.control} label="Unit" required />
            <RHFTextField name="quantity" control={qtyForm.control} label="Quantity" type="number" required />
            <RHFTextField name="remarks" control={qtyForm.control} label="Remarks" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQtyOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={qtyForm.handleSubmit(addQuantitySheetLine)}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rateAnalysisOpen} onClose={() => setRateAnalysisOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Rate Analysis Line</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="work_item" control={rateAnalysisForm.control} label="Work Item" required />
            <RHFTextField name="material_cost" control={rateAnalysisForm.control} label="Material Cost (₹)" type="number" />
            <RHFTextField name="labour_cost" control={rateAnalysisForm.control} label="Labour Cost (₹)" type="number" />
            <RHFTextField name="machinery_cost" control={rateAnalysisForm.control} label="Machinery Cost (₹)" type="number" />
            <RHFTextField name="overhead_percent" control={rateAnalysisForm.control} label="Overhead %" type="number" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateAnalysisOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={rateAnalysisForm.handleSubmit(addRateAnalysisLine)}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
