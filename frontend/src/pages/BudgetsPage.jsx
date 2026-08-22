import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { budgetSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function BudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: { department: '', allocated_amount: '', project_id: '' },
  });

  const load = () => {
    api.get('/budgets').then((res) => setBudgets(res.data)).catch(() => setBudgets([]));
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => setProjects([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ department: '', allocated_amount: '', project_id: '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/budgets', values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  const canCreate = ['FINANCE', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'department', headerName: 'Department', minWidth: 180 },
    { field: 'project_name', headerName: 'Project', minWidth: 160, valueFormatter: (p) => p.value || 'Department-wide' },
    { field: 'allocated_amount', headerName: 'Allocated', type: 'numericColumn', minWidth: 140, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'utilized_amount', headerName: 'Utilized', type: 'numericColumn', minWidth: 140, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'balance', headerName: 'Balance', type: 'numericColumn', minWidth: 140, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
  ];

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Department Budgets</Typography>
          {canCreate && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
              Allocate Budget
            </Button>
          )}
        </Stack>
      }
    >
      <DataTable rowData={budgets} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} pagination={false} fillHeight />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Allocate Department Budget</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFTextField name="department" control={control} label="Department" required />
            <RHFSelect name="project_id" control={control} label="Project (optional — leave blank for a department-wide budget)" options={projects} getLabel={(p) => p.project_name} getValue={(p) => p.id} />
            <RHFTextField name="allocated_amount" control={control} label="Allocated Amount (₹)" type="number" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Allocate</Button>
        </DialogActions>
      </Dialog>
    </ListPageLayout>
  );
}
