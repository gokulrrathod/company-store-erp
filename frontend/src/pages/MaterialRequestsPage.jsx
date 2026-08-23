import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, IconButton, Alert,
  RadioGroup, FormControlLabel, Radio, TextField, MenuItem, Paper, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function RequestCard({ request, onApprove, onReject, onForward, canAction }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: '10px', mb: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, flexWrap: 'wrap' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          <AssignmentIcon fontSize="small" />
        </Avatar>
        <Typography variant="subtitle1" fontWeight={700}>{request.requisition_number}</Typography>
        <Chip size="small" label={request.priority} color={priorityColor[request.priority]} />
        <Chip size="small" label={request.status.replace(/_/g, ' ')} color={statusColor[request.status]} />
        <Box sx={{ flexGrow: 1 }} />
        {canAction && request.status === 'PENDING' && (
          <>
            <IconButton size="small" color="success" onClick={() => onApprove(request)} title="Approve & issue"><CheckIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => onReject(request.id)} title="Reject"><CloseIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="info" onClick={() => onForward(request.id)} title="Forward to Purchase (stock unavailable)"><SendIcon fontSize="small" /></IconButton>
          </>
        )}
        {canAction && ['FORWARDED_TO_PURCHASE', 'PO_RAISED'].includes(request.status) && (
          <>
            <IconButton size="small" color="success" onClick={() => onApprove(request)} title="Stock arrived — approve & issue"><CheckIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => onReject(request.id)} title="Reject"><CloseIcon fontSize="small" /></IconButton>
          </>
        )}
      </Box>

      <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          Item: <strong style={{ color: 'inherit' }}>{request.item_code} — {request.item_name}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Requested By: <strong style={{ color: 'inherit' }}>{request.requested_by} ({request.department})</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Quantity: <strong style={{ color: 'inherit' }}>
            Req {request.quantity_requested} &middot; Issued {request.quantity_issued ?? '—'} &middot; Bal {request.balance_stock ?? '—'}
          </strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Project / Due: <strong style={{ color: 'inherit' }}>
            {request.project_name || '—'} &middot; {request.required_date ? new Date(request.required_date).toLocaleDateString() : 'No due date'}
          </strong>
        </Typography>
      </Box>

      {request.purpose && (
        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
            Purpose
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>{request.purpose}</Typography>
        </Box>
      )}
    </Paper>
  );
}

export default function MaterialRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
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

  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageRequests = useMemo(
    () => requests.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize),
    [requests, clampedPage, pageSize]
  );
  const rangeStart = requests.length === 0 ? 0 : clampedPage * pageSize + 1;
  const rangeEnd = Math.min(requests.length, clampedPage * pageSize + pageSize);

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
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
          {requests.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No material requests yet.</Typography>
          )}
          {pageRequests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              canAction={canAction}
              onApprove={openApprove}
              onReject={(id) => setStatus(id, 'REJECTED')}
              onForward={forward}
            />
          ))}
        </Box>

        {requests.length > 0 && (
          <Box sx={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2,
            px: 1, py: 1, borderTop: '1px solid', borderColor: 'divider',
          }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">Page Size:</Typography>
              <TextField
                select size="small" value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                sx={{ width: 90 }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {rangeStart} to {rangeEnd} of {requests.length}
            </Typography>
            <IconButton size="small" disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" color="text.secondary">Page {clampedPage + 1} of {totalPages}</Typography>
            <IconButton size="small" disabled={clampedPage >= totalPages - 1} onClick={() => setPage(clampedPage + 1)}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

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
