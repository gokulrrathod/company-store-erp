import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import { productionPlanSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function ProductionPlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(productionPlanSchema),
    defaultValues: {
      project_reference: '', week_number: '', start_date: '', end_date: '',
      planned_quantity: '', planned_completion_date: '', production_engineer: user?.name || '',
    },
  });

  const load = () => {
    api.get('/production/plans').then((res) => setPlans(res.data)).catch(() => setPlans([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ project_reference: '', week_number: '', start_date: '', end_date: '', planned_quantity: '', planned_completion_date: '', production_engineer: user?.name || '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/production/plans', values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  const canCreate = ['PRODUCTION', 'PRODUCTION_HEAD', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'project_reference', headerName: 'Project', minWidth: 180 },
    { field: 'week_number', headerName: 'Week', minWidth: 100 },
    { field: 'start_date', headerName: 'Start', minWidth: 110, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'end_date', headerName: 'End', minWidth: 110, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'planned_quantity', headerName: 'Planned Qty', type: 'numericColumn', minWidth: 120 },
    { field: 'production_engineer', headerName: 'Engineer', minWidth: 150 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={p.value === 'APPROVED' ? 'success' : 'warning'} />,
    },
    {
      headerName: 'View',
      minWidth: 70,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (p) => (
        <IconButton size="small" onClick={() => navigate(`/production-plans/${p.data.id}`)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Weekly Production Plans</Typography>
        {canCreate && (
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
            New Plan
          </Button>
        )}
      </Stack>

      <DataTable rowData={plans} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Weekly Production Plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFTextField name="project_reference" control={control} label="Project Reference" required />
            <RHFTextField name="week_number" control={control} label="Week Number" required />
            <RHFTextField name="start_date" control={control} label="Start Date" type="date" required InputLabelProps={{ shrink: true }} />
            <RHFTextField name="end_date" control={control} label="End Date" type="date" required InputLabelProps={{ shrink: true }} />
            <RHFTextField name="planned_quantity" control={control} label="Planned Quantity" type="number" required />
            <RHFTextField name="planned_completion_date" control={control} label="Planned Completion Date" type="date" InputLabelProps={{ shrink: true }} />
            <RHFTextField name="production_engineer" control={control} label="Production Engineer" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Create</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
