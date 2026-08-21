import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Stack, Alert, IconButton, Paper, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { scheduleStatusSchema, stageInspectionSchema, reworkRejectionSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const scheduleStatusColor = { NOT_STARTED: 'default', IN_PROGRESS: 'warning', COMPLETED: 'success', DELAYED: 'error' };
const inspectionStatusColor = { OK: 'success', HOLD: 'warning', REJECT: 'error' };

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DELAYED', label: 'Delayed' },
];
const INSPECTION_STAGES = [
  'GAS_CUTTING', 'GRINDING', 'ROLLING', 'BENDING', 'FIT_UP', 'WELDING', 'FINISHING',
  'TRIAL_ASSEMBLY', 'BLASTING', 'PAINTING', 'FINAL_INSPECTION',
];
const INSPECTION_RESULTS = [
  { value: 'OK', label: 'OK' },
  { value: 'HOLD', label: 'Hold' },
  { value: 'REJECT', label: 'Reject' },
];

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function ScheduleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schedule, setSchedule] = useState(null);
  const [actionError, setActionError] = useState('');
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [reworkOpen, setReworkOpen] = useState(false);

  const load = () => {
    api.get(`/production/schedules/${id}`).then((res) => setSchedule(res.data)).catch(() => setSchedule(null));
  };

  useEffect(load, [id]);

  const statusForm = useForm({
    resolver: zodResolver(scheduleStatusSchema),
    defaultValues: { status: 'NOT_STARTED', delay_reason: '', actual_start_date: '', actual_end_date: '' },
  });
  const inspectionForm = useForm({
    resolver: zodResolver(stageInspectionSchema),
    defaultValues: { inspection_stage: '', inspector_name: user?.name || '', status: 'OK', remarks: '' },
  });
  const reworkForm = useForm({
    resolver: zodResolver(reworkRejectionSchema),
    defaultValues: { part_name: '', quantity_produced: '', rework_qty: '0', rejection_qty: '0', reason: '', corrective_action: '', responsible_engineer: user?.name || '' },
  });

  useEffect(() => {
    if (schedule) {
      statusForm.reset({
        status: schedule.status, delay_reason: schedule.delay_reason || '',
        actual_start_date: schedule.actual_start_date || '', actual_end_date: schedule.actual_end_date || '',
      });
    }
  }, [schedule?.status]);

  const canUpdateStatus = ['PRODUCTION', 'SHOP_FLOOR_ENGINEER', 'ADMIN'].includes(user?.role);
  const canInspect = ['QUALITY', 'SHOP_FLOOR_ENGINEER', 'ADMIN'].includes(user?.role);
  const canLogRework = ['PRODUCTION', 'SHOP_FLOOR_ENGINEER', 'ADMIN'].includes(user?.role);

  const submitStatus = async (values) => {
    setActionError('');
    try {
      await api.patch(`/production/schedules/${id}/status`, values);
      load();
    } catch (err) {
      applyServerErrors(err, statusForm.setError, setActionError);
    }
  };

  const submitInspection = async (values) => {
    setActionError('');
    try {
      await api.post(`/production/schedules/${id}/stage-inspections`, values);
      setInspectionOpen(false);
      inspectionForm.reset({ inspection_stage: '', inspector_name: user?.name || '', status: 'OK', remarks: '' });
      load();
    } catch (err) {
      applyServerErrors(err, inspectionForm.setError, setActionError);
    }
  };

  const submitRework = async (values) => {
    setActionError('');
    try {
      await api.post(`/production/schedules/${id}/rework-rejections`, values);
      setReworkOpen(false);
      reworkForm.reset({ part_name: '', quantity_produced: '', rework_qty: '0', rejection_qty: '0', reason: '', corrective_action: '', responsible_engineer: user?.name || '' });
      load();
    } catch (err) {
      applyServerErrors(err, reworkForm.setError, setActionError);
    }
  };

  if (!schedule) return <Typography>Loading...</Typography>;

  const inspectionColumnDefs = [
    { field: 'inspection_stage', headerName: 'Stage', minWidth: 140, valueFormatter: (p) => p.value.replace(/_/g, ' ') },
    { field: 'inspection_date', headerName: 'Date', minWidth: 110, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'inspector_name', headerName: 'Inspector', minWidth: 140 },
    { field: 'status', headerName: 'Result', minWidth: 100, cellRenderer: (p) => <Chip size="small" label={p.value} color={inspectionStatusColor[p.value]} /> },
    { field: 'remarks', headerName: 'Remarks', minWidth: 180, valueFormatter: (p) => p.value || '—' },
  ];

  const reworkColumnDefs = [
    { field: 'part_name', headerName: 'Part', minWidth: 150 },
    { field: 'quantity_produced', headerName: 'Produced', type: 'numericColumn', minWidth: 100 },
    { field: 'rework_qty', headerName: 'Rework', type: 'numericColumn', minWidth: 90 },
    { field: 'rejection_qty', headerName: 'Rejected', type: 'numericColumn', minWidth: 90 },
    { field: 'reason', headerName: 'Reason', minWidth: 180 },
  ];

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate(-1)}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>{schedule.equipment_name} — {schedule.activity}</Typography>
        <Chip size="small" label={schedule.status.replace(/_/g, ' ')} color={scheduleStatusColor[schedule.status]} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
        Responsible: {schedule.responsible_engineer}
      </Typography>

      {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}

      {canUpdateStatus && (
        <Section title="Update Activity Status">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <RHFSelect name="status" control={statusForm.control} label="Status" required options={STATUS_OPTIONS} getLabel={(s) => s.label} getValue={(s) => s.value} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <RHFTextField name="actual_start_date" control={statusForm.control} label="Actual Start Date" type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <RHFTextField name="actual_end_date" control={statusForm.control} label="Actual End Date" type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <RHFTextField name="delay_reason" control={statusForm.control} label="Delay Reason (required if Delayed)" multiline rows={2} />
            </Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 2 }} onClick={statusForm.handleSubmit(submitStatus)}>Save Status</Button>
        </Section>
      )}

      <Section title="Stage Inspections">
        <DataTable rowData={schedule.inspections} columnDefs={inspectionColumnDefs} pagination={false} height={Math.max(160, schedule.inspections.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No stage inspections yet." />
        {canInspect && (
          <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setInspectionOpen(true)}>Log Stage Inspection</Button>
        )}
      </Section>

      <Section title="Rework &amp; Rejection">
        <DataTable rowData={schedule.reworks} columnDefs={reworkColumnDefs} pagination={false} height={Math.max(160, schedule.reworks.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No rework or rejection entries." />
        {canLogRework && (
          <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setReworkOpen(true)}>Log Rework / Rejection</Button>
        )}
      </Section>

      <Dialog open={inspectionOpen} onClose={() => setInspectionOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Log Stage Inspection</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFSelect name="inspection_stage" control={inspectionForm.control} label="Inspection Stage" required options={INSPECTION_STAGES} getLabel={(s) => s.replace(/_/g, ' ')} getValue={(s) => s} />
            <RHFTextField name="inspector_name" control={inspectionForm.control} label="Inspector Name" required />
            <RHFSelect name="status" control={inspectionForm.control} label="Result" required options={INSPECTION_RESULTS} getLabel={(s) => s.label} getValue={(s) => s.value} />
            <RHFTextField name="remarks" control={inspectionForm.control} label="Remarks" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInspectionOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={inspectionForm.handleSubmit(submitInspection)}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reworkOpen} onClose={() => setReworkOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Log Rework / Rejection</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="part_name" control={reworkForm.control} label="Part Name" required />
            <RHFTextField name="quantity_produced" control={reworkForm.control} label="Quantity Produced" type="number" required />
            <RHFTextField name="rework_qty" control={reworkForm.control} label="Rework Quantity" type="number" />
            <RHFTextField name="rejection_qty" control={reworkForm.control} label="Rejection Quantity" type="number" />
            <RHFTextField name="reason" control={reworkForm.control} label="Reason" required multiline rows={2} />
            <RHFTextField name="corrective_action" control={reworkForm.control} label="Corrective Action" multiline rows={2} />
            <RHFTextField name="responsible_engineer" control={reworkForm.control} label="Responsible Engineer" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReworkOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={reworkForm.handleSubmit(submitRework)}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
