import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { safetySchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const CATEGORIES = [
  'PPE Compliance Audit',
  'Chemical Storage Check',
  'Hazardous Material Register',
  'Spill Incident Register',
  'Fire Safety Inspection',
];
const SEVERITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High (Immediate Escalation)' },
];
const severityColor = { LOW: 'success', MEDIUM: 'warning', HIGH: 'error' };

export default function SafetyPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(safetySchema),
    defaultValues: { category: '', zone: '', reported_by: '', severity: '', action_taken: '' },
  });

  const load = () => {
    api.get('/safety').then((res) => setLogs(res.data)).catch(() => setLogs([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ category: '', zone: '', reported_by: '', severity: '', action_taken: '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/safety', values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  const close = async (id) => {
    await api.patch(`/safety/${id}/close`);
    load();
  };

  const canCreate = ['STORE_EXECUTIVE', 'STORE_MANAGER', 'QUALITY', 'ADMIN'].includes(user?.role);
  const canClose = ['STORE_MANAGER', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'incident_date', headerName: 'Date', minWidth: 120, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'category', headerName: 'Category', minWidth: 180 },
    { field: 'zone', headerName: 'Zone', minWidth: 150, valueFormatter: (p) => p.value || '—' },
    { field: 'reported_by', headerName: 'Reported By', minWidth: 140 },
    {
      field: 'severity',
      headerName: 'Severity',
      minWidth: 110,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={severityColor[p.value]} />,
    },
    { field: 'action_taken', headerName: 'Action Taken', minWidth: 220, valueFormatter: (p) => p.value || '—' },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 110,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={p.value === 'CLOSED' ? 'success' : 'warning'} />,
    },
    ...(canClose
      ? [{
          headerName: 'Actions',
          minWidth: 100,
          sortable: false,
          filter: false,
          cellRenderer: (p) => (p.data.status === 'OPEN' ? <Button size="small" onClick={() => close(p.data.id)}>Close</Button> : null),
        }]
      : []),
  ];

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Safety, Chemical &amp; Compliance Incident Log</Typography>
          {canCreate && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
              Log Safety Incident / Audit
            </Button>
          )}
        </Stack>
      }
    >
      <DataTable rowData={logs} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} fillHeight />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Log Safety Incident / Audit</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFSelect name="category" control={control} label="Category" required options={CATEGORIES} getLabel={(c) => c} getValue={(c) => c} />
            <RHFSelect name="severity" control={control} label="Severity" required options={SEVERITIES} getLabel={(s) => s.label} getValue={(s) => s.value} />
            <RHFTextField name="zone" control={control} label="Zone / Warehouse Location" />
            <RHFTextField name="reported_by" control={control} label="Reported By" required />
            <RHFTextField name="action_taken" control={control} label="Corrective Action Taken" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Save</Button>
        </DialogActions>
      </Dialog>
    </ListPageLayout>
  );
}
