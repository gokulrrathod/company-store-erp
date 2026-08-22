import { useEffect, useState } from 'react';
import {
  Typography, Button, Stack, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = { OPEN: 'default', PARTIALLY_RECEIVED: 'warning', CLOSED: 'success', AMENDED: 'error' };
const budgetStatusColor = { WITHIN_BUDGET: 'success', PENDING_FINANCE_APPROVAL: 'error', FINANCE_APPROVED: 'success' };
const isPastDue = (row) => row.expected_delivery_date && !row.actual_delivery_date && new Date(row.expected_delivery_date) < new Date();

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [amendTarget, setAmendTarget] = useState(null);
  const [amendDate, setAmendDate] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [amendError, setAmendError] = useState('');

  const load = () => {
    api.get('/purchase-orders').then((res) => setOrders(res.data)).catch(() => setOrders([]));
  };

  useEffect(load, []);

  const canCreate = ['PURCHASE', 'ADMIN'].includes(user?.role);
  const canFinanceApprove = ['FINANCE', 'ADMIN'].includes(user?.role);
  const canAmend = ['PURCHASE', 'ADMIN'].includes(user?.role);

  const financeApprove = async (id) => {
    await api.patch(`/purchase-orders/${id}/finance-approve`);
    load();
  };

  const openAmend = (row) => {
    setAmendTarget(row);
    setAmendDate(row.expected_delivery_date ? row.expected_delivery_date.slice(0, 10) : '');
    setAmendReason('');
    setAmendError('');
  };

  const submitAmend = async () => {
    setAmendError('');
    if (!amendReason.trim()) {
      setAmendError('An amendment reason is required.');
      return;
    }
    try {
      await api.patch(`/purchase-orders/${amendTarget.id}/amend`, {
        expected_delivery_date: amendDate || undefined,
        amendment_reason: amendReason,
      });
      setAmendTarget(null);
      load();
    } catch (err) {
      setAmendError(err?.response?.data?.error || 'Failed to amend');
    }
  };

  const columnDefs = [
    { field: 'po_number', headerName: 'PO Number', minWidth: 150 },
    { field: 'supplier_name', headerName: 'Supplier', minWidth: 180 },
    { field: 'department', headerName: 'Department', minWidth: 130, valueFormatter: (p) => p.value || '—' },
    { field: 'project_name', headerName: 'Project', minWidth: 150, valueFormatter: (p) => p.value || '—' },
    { field: 'total_value', headerName: 'Value', type: 'numericColumn', minWidth: 120, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'created_by', headerName: 'Created By', minWidth: 150 },
    {
      field: 'expected_delivery_date', headerName: 'Expected Delivery', minWidth: 150,
      cellRenderer: (p) => p.value ? (
        <span style={{ color: isPastDue(p.data) ? '#c62828' : 'inherit' }}>
          {new Date(p.value).toLocaleDateString()}{isPastDue(p.data) ? ' (delayed)' : ''}
        </span>
      ) : '—',
    },
    { field: 'actual_delivery_date', headerName: 'Actual Delivery', minWidth: 130, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—') },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 150,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={statusColor[p.value]} />,
    },
    {
      field: 'budget_status',
      headerName: 'Budget',
      minWidth: 190,
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color={budgetStatusColor[p.value]} />,
    },
    { field: 'created_at', headerName: 'Date', minWidth: 120, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    ...(canFinanceApprove
      ? [{
          headerName: 'Budget Action',
          minWidth: 150,
          sortable: false,
          filter: false,
          cellRenderer: (p) =>
            p.data.budget_status === 'PENDING_FINANCE_APPROVAL' ? (
              <Button size="small" variant="contained" onClick={() => financeApprove(p.data.id)}>Approve Budget</Button>
            ) : null,
        }]
      : []),
    ...(canAmend
      ? [{
          headerName: 'Delivery Action',
          minWidth: 110,
          sortable: false,
          filter: false,
          cellRenderer: (p) =>
            p.data.status !== 'CLOSED' ? (
              <Button size="small" onClick={() => openAmend(p.data)}>Amend</Button>
            ) : null,
        }]
      : []),
  ];

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Purchase Orders</Typography>
          {canCreate && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/purchase-orders/new')}>
              New Purchase Order
            </Button>
          )}
        </Stack>
      }
    >
      <DataTable rowData={orders} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} fillHeight />

      <Dialog open={!!amendTarget} onClose={() => setAmendTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Amend {amendTarget?.po_number}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {amendError && <Alert severity="error">{amendError}</Alert>}
            <TextField
              label="Revised Expected Delivery Date" type="date" InputLabelProps={{ shrink: true }}
              value={amendDate} onChange={(e) => setAmendDate(e.target.value)}
            />
            <TextField
              label="Amendment Reason" required multiline rows={3}
              value={amendReason} onChange={(e) => setAmendReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAmendTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitAmend}>Save Amendment</Button>
        </DialogActions>
      </Dialog>
    </ListPageLayout>
  );
}
