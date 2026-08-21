import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import { budgetSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function BudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: { department: '', allocated_amount: '' },
  });

  const load = () => {
    api.get('/budgets').then((res) => setBudgets(res.data)).catch(() => setBudgets([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ department: '', allocated_amount: '' });
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
    { field: 'allocated_amount', headerName: 'Allocated', type: 'numericColumn', minWidth: 140, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'utilized_amount', headerName: 'Utilized', type: 'numericColumn', minWidth: 140, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'balance', headerName: 'Balance', type: 'numericColumn', minWidth: 140, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
  ];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Department Budgets</Typography>
        {canCreate && (
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
            Allocate Budget
          </Button>
        )}
      </Stack>

      <DataTable rowData={budgets} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} pagination={false} />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Allocate Department Budget</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFTextField name="department" control={control} label="Department" required />
            <RHFTextField name="allocated_amount" control={control} label="Allocated Amount (₹)" type="number" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Allocate</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
