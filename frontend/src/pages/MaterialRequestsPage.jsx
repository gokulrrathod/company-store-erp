import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, IconButton, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { materialRequestSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';

const statusColor = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };
const DEPARTMENTS = ['Production', 'Purchase', 'Quality', 'Maintenance', 'Admin'];

export default function MaterialRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(materialRequestSchema),
    defaultValues: { department: '', item_id: '', requested_by: '', quantity_requested: '', purpose: '', remarks: '' },
  });

  const load = () => {
    api.get('/material-requests').then((res) => setRequests(res.data)).catch(() => setRequests([]));
    api.get('/items').then((res) => setItems(res.data)).catch(() => setItems([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ department: '', item_id: '', requested_by: '', quantity_requested: '', purpose: '', remarks: '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/material-requests', values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  const setStatus = async (id, status) => {
    await api.patch(`/material-requests/${id}/status`, { status });
    load();
  };

  const columnDefs = [
    { field: 'requisition_number', headerName: 'Requisition No.', minWidth: 150 },
    { field: 'department', headerName: 'Department', minWidth: 130 },
    { headerName: 'Item', minWidth: 180, valueGetter: (p) => `${p.data.item_code} — ${p.data.item_name}` },
    { field: 'requested_by', headerName: 'Requested By', minWidth: 140 },
    { field: 'quantity_requested', headerName: 'Qty Requested', type: 'numericColumn', minWidth: 130 },
    { field: 'quantity_issued', headerName: 'Qty Issued', type: 'numericColumn', minWidth: 110, valueFormatter: (p) => p.value ?? '—' },
    { field: 'balance_stock', headerName: 'Balance Stock', type: 'numericColumn', minWidth: 130, valueFormatter: (p) => p.value ?? '—' },
    { field: 'purpose', headerName: 'Purpose', minWidth: 150, valueGetter: (p) => p.data.purpose || '—' },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={statusColor[p.value]} />,
    },
    {
      headerName: 'Actions',
      minWidth: 100,
      sortable: false,
      filter: false,
      cellRenderer: (p) =>
        p.data.status === 'PENDING' ? (
          <>
            <IconButton size="small" color="success" onClick={() => setStatus(p.data.id, 'APPROVED')}><CheckIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => setStatus(p.data.id, 'REJECTED')}><CloseIcon fontSize="small" /></IconButton>
          </>
        ) : null,
    },
  ];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Material Requests</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
          New Request
        </Button>
      </Stack>

      <DataTable rowData={requests} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Material Request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFSelect name="department" control={control} label="Department" required options={DEPARTMENTS} getLabel={(d) => d} getValue={(d) => d} />
            <RHFSelect name="item_id" control={control} label="Item" required options={items} getLabel={(i) => `${i.code} — ${i.name}`} getValue={(i) => i.id} />
            <RHFTextField name="requested_by" control={control} label="Requested By" required />
            <RHFTextField name="quantity_requested" control={control} label="Quantity Requested" type="number" required />
            <RHFTextField name="purpose" control={control} label="Purpose" />
            <RHFTextField name="remarks" control={control} label="Remarks" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Submit</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
