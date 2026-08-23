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
import { housekeepingSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const ACTIVITIES = [
  'Daily Cleaning & Aisle Clearance',
  'Weekly Deep Cleaning',
  'Rack & Pallet Integrity Inspection',
  'Fire Extinguisher Inspection',
  'Pest Control Check',
  'Equipment & Forklift Maintenance',
];

export default function HousekeepingPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(housekeepingSchema),
    defaultValues: { activity: '', performed_by: '', verified_by: '', remarks: '' },
  });

  const load = () => {
    api.get('/housekeeping').then((res) => setLogs(res.data)).catch(() => setLogs([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ activity: '', performed_by: '', verified_by: '', remarks: '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/housekeeping', values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  const canCreate = ['STORE_EXECUTIVE', 'STORE_MANAGER', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'log_date', headerName: 'Log Date', minWidth: 130, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'activity', headerName: 'Activity', minWidth: 220 },
    { field: 'performed_by', headerName: 'Performed By', minWidth: 150 },
    { field: 'verified_by', headerName: 'Verified By', minWidth: 150, valueFormatter: (p) => p.value || '—' },
    { field: 'remarks', headerName: 'Remarks', minWidth: 220, valueFormatter: (p) => p.value || '—' },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      pinned: 'right',
      cellRenderer: (p) => <Chip size="small" label={p.value} color={p.value === 'VERIFIED' ? 'success' : 'warning'} />,
    },
  ];

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Store Housekeeping &amp; Maintenance Checklist</Typography>
          {canCreate && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
              Log Housekeeping Activity
            </Button>
          )}
        </Stack>
      }
    >
      <DataTable rowData={logs} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} fillHeight />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Log Housekeeping Activity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFSelect name="activity" control={control} label="Activity / Checklist" required options={ACTIVITIES} getLabel={(a) => a} getValue={(a) => a} />
            <RHFTextField name="performed_by" control={control} label="Performed By" required />
            <RHFTextField name="verified_by" control={control} label="Verified By" />
            <RHFTextField name="remarks" control={control} label="Remarks" multiline rows={2} />
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
