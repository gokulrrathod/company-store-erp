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
import { stockMovementSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';

const TYPES = [{ value: 'IN', label: 'Stock In' }, { value: 'OUT', label: 'Stock Out' }];

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: { item_id: '', type: 'IN', quantity: '', reference: '', remarks: '' },
  });

  const load = () => {
    api.get('/stock-movements').then((res) => setMovements(res.data)).catch(() => setMovements([]));
    api.get('/items').then((res) => setItems(res.data)).catch(() => setItems([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ item_id: '', type: 'IN', quantity: '', reference: '', remarks: '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/stock-movements', values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  const columnDefs = [
    { field: 'created_at', headerName: 'Date', minWidth: 160, valueFormatter: (p) => new Date(p.value).toLocaleString() },
    { headerName: 'Item', minWidth: 180, valueGetter: (p) => `${p.data.item_code} — ${p.data.item_name}` },
    {
      field: 'type',
      headerName: 'Type',
      minWidth: 100,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={p.value === 'IN' ? 'success' : 'warning'} />,
    },
    { field: 'quantity', headerName: 'Quantity', type: 'numericColumn', minWidth: 100 },
    { field: 'reference', headerName: 'Reference', minWidth: 150 },
    { field: 'remarks', headerName: 'Remarks', minWidth: 200 },
  ];

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Stock Movements</Typography>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
            New Entry
          </Button>
        </Stack>
      }
    >
      <DataTable rowData={movements} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} fillHeight />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Stock Movement</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFSelect name="item_id" control={control} label="Item" required options={items} getLabel={(i) => `${i.code} — ${i.name}`} getValue={(i) => i.id} />
            <RHFSelect name="type" control={control} label="Type" required options={TYPES} getLabel={(t) => t.label} getValue={(t) => t.value} />
            <RHFTextField name="quantity" control={control} label="Quantity" type="number" required />
            <RHFTextField name="reference" control={control} label="Reference" />
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
