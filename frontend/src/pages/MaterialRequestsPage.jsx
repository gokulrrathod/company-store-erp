import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, IconButton, Alert,
  RadioGroup, FormControlLabel, Radio, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { materialRequestSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
  FORWARDED_TO_PURCHASE: 'info', PO_RAISED: 'secondary',
};
const DEPARTMENTS = ['Production', 'Purchase', 'Quality', 'Maintenance', 'Admin'];
const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];
const priorityColor = { LOW: 'default', MEDIUM: 'default', HIGH: 'warning', URGENT: 'error' };

export default function MaterialRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveBatches, setApproveBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [approveError, setApproveError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(materialRequestSchema),
    defaultValues: {
      department: '', item_id: '', requested_by: '', quantity_requested: '', purpose: '', remarks: '',
      project_id: '', priority: 'MEDIUM', required_date: '',
    },
  });

  const load = () => {
    api.get('/material-requests').then((res) => setRequests(res.data)).catch(() => setRequests([]));
    api.get('/items').then((res) => setItems(res.data)).catch(() => setItems([]));
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => setProjects([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({
      department: '', item_id: '', requested_by: '', quantity_requested: '', purpose: '', remarks: '',
      project_id: '', priority: 'MEDIUM', required_date: '',
    });
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

  const forward = async (id) => {
    await api.patch(`/material-requests/${id}/forward`);
    load();
  };

  const openApprove = async (row) => {
    setApproveError('');
    setApproveTarget(row);
    setOverrideReason('');
    try {
      const { data } = await api.get(`/items/${row.item_id}/batches`);
      setApproveBatches(data);
      setSelectedBatchId(data[0]?.id ?? '');
    } catch {
      setApproveBatches([]);
      setSelectedBatchId('');
    }
  };

  const confirmApprove = async () => {
    setApproveError('');
    const suggestedId = approveBatches[0]?.id;
    const isOverride = selectedBatchId && String(selectedBatchId) !== String(suggestedId);
    if (isOverride && !overrideReason.trim()) {
      setApproveError('A reason is required when issuing a batch other than the suggested FIFO/FEFO one.');
      return;
    }
    try {
      await api.patch(`/material-requests/${approveTarget.id}/status`, {
        status: 'APPROVED',
        override_batch_id: selectedBatchId || null,
        override_reason: isOverride ? overrideReason : undefined,
      });
      setApproveTarget(null);
      load();
    } catch (err) {
      setApproveError(err?.response?.data?.error || 'Failed to approve');
    }
  };

  const canAction = ['STORE_MANAGER', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'requisition_number', headerName: 'Requisition No.', minWidth: 150 },
    { field: 'department', headerName: 'Department', minWidth: 130 },
    { headerName: 'Item', minWidth: 180, valueGetter: (p) => `${p.data.item_code} — ${p.data.item_name}` },
    { field: 'requested_by', headerName: 'Requested By', minWidth: 140 },
    { field: 'quantity_requested', headerName: 'Qty Requested', type: 'numericColumn', minWidth: 130 },
    { field: 'quantity_issued', headerName: 'Qty Issued', type: 'numericColumn', minWidth: 110, valueFormatter: (p) => p.value ?? '—' },
    { field: 'balance_stock', headerName: 'Balance Stock', type: 'numericColumn', minWidth: 130, valueFormatter: (p) => p.value ?? '—' },
    { field: 'purpose', headerName: 'Purpose', minWidth: 150, valueGetter: (p) => p.data.purpose || '—' },
    { field: 'project_name', headerName: 'Project', minWidth: 150, valueGetter: (p) => p.data.project_name || '—' },
    { field: 'required_date', headerName: 'Required Date', minWidth: 130, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—') },
    {
      field: 'priority', headerName: 'Priority', minWidth: 100,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={priorityColor[p.value]} />,
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      pinned: 'right',
      cellRenderer: (p) => <Chip size="small" label={p.value} color={statusColor[p.value]} />,
    },
    {
      headerName: 'Actions',
      minWidth: 160,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: (p) => {
        if (!canAction) return null;
        if (p.data.status === 'PENDING') {
          return (
            <>
              <IconButton size="small" color="success" onClick={() => openApprove(p.data)} title="Approve &amp; issue"><CheckIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => setStatus(p.data.id, 'REJECTED')} title="Reject"><CloseIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="info" onClick={() => forward(p.data.id)} title="Forward to Purchase (stock unavailable)"><SendIcon fontSize="small" /></IconButton>
            </>
          );
        }
        if (['FORWARDED_TO_PURCHASE', 'PO_RAISED'].includes(p.data.status)) {
          return (
            <>
              <IconButton size="small" color="success" onClick={() => openApprove(p.data)} title="Stock arrived — approve &amp; issue"><CheckIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => setStatus(p.data.id, 'REJECTED')} title="Reject"><CloseIcon fontSize="small" /></IconButton>
            </>
          );
        }
        return null;
      },
    },
  ];

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Material Requests</Typography>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
            New Request
          </Button>
        </Stack>
      }
    >
      <DataTable rowData={requests} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} fillHeight />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Material Request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFSelect name="department" control={control} label="Department" required options={DEPARTMENTS} getLabel={(d) => d} getValue={(d) => d} />
            <RHFSelect name="item_id" control={control} label="Item" required options={items} getLabel={(i) => `${i.code} — ${i.name}`} getValue={(i) => i.id} />
            <RHFTextField name="requested_by" control={control} label="Requested By" required />
            <RHFTextField name="quantity_requested" control={control} label="Quantity Requested" type="number" required />
            <RHFSelect name="project_id" control={control} label="Project (optional)" options={projects} getLabel={(p) => p.project_name} getValue={(p) => p.id} />
            <RHFSelect name="priority" control={control} label="Priority" options={PRIORITIES} getLabel={(p) => p.label} getValue={(p) => p.value} />
            <RHFTextField name="required_date" control={control} label="Required Date" type="date" InputLabelProps={{ shrink: true }} />
            <RHFTextField name="purpose" control={control} label="Purpose" />
            <RHFTextField name="remarks" control={control} label="Remarks" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Submit</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!approveTarget} onClose={() => setApproveTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Approve &amp; Issue — {approveTarget?.requisition_number}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {approveError && <Alert severity="error">{approveError}</Alert>}
            {approveBatches.length === 0 ? (
              <Alert severity="warning">No tracked batches found for this item — issuing from untracked/legacy stock.</Alert>
            ) : (
              <>
                <Alert severity="info">
                  System suggests the {approveBatches[0].expiry_date ? 'nearest-expiry' : 'oldest'} batch first (FIFO/FEFO). Picking a different one requires a reason.
                </Alert>
                <RadioGroup value={String(selectedBatchId)} onChange={(e) => setSelectedBatchId(e.target.value)}>
                  {approveBatches.map((b, idx) => (
                    <FormControlLabel
                      key={b.id}
                      value={String(b.id)}
                      control={<Radio size="small" />}
                      label={`${idx === 0 ? '(Suggested) ' : ''}${b.batch_number || 'OPENING'} — ${b.quantity_remaining} available${b.expiry_date ? `, expires ${new Date(b.expiry_date).toLocaleDateString()}` : ''}`}
                    />
                  ))}
                </RadioGroup>
                {String(selectedBatchId) !== String(approveBatches[0]?.id) && (
                  <TextField
                    label="Override reason" required multiline rows={2}
                    value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
                  />
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveTarget(null)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={confirmApprove}>Approve &amp; Issue</Button>
        </DialogActions>
      </Dialog>
    </ListPageLayout>
  );
}
