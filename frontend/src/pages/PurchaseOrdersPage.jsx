import { useEffect, useState } from 'react';
import { Typography, Button, Stack, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = { OPEN: 'default', PARTIALLY_RECEIVED: 'warning', CLOSED: 'success' };
const budgetStatusColor = { WITHIN_BUDGET: 'success', PENDING_FINANCE_APPROVAL: 'error', FINANCE_APPROVED: 'success' };

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  const load = () => {
    api.get('/purchase-orders').then((res) => setOrders(res.data)).catch(() => setOrders([]));
  };

  useEffect(load, []);

  const canCreate = ['PURCHASE', 'ADMIN'].includes(user?.role);
  const canFinanceApprove = ['FINANCE', 'ADMIN'].includes(user?.role);

  const financeApprove = async (id) => {
    await api.patch(`/purchase-orders/${id}/finance-approve`);
    load();
  };

  const columnDefs = [
    { field: 'po_number', headerName: 'PO Number', minWidth: 150 },
    { field: 'supplier_name', headerName: 'Supplier', minWidth: 180 },
    { field: 'department', headerName: 'Department', minWidth: 130, valueFormatter: (p) => p.value || '—' },
    { field: 'total_value', headerName: 'Value', type: 'numericColumn', minWidth: 120, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'created_by', headerName: 'Created By', minWidth: 150 },
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
          headerName: 'Actions',
          minWidth: 140,
          sortable: false,
          filter: false,
          cellRenderer: (p) =>
            p.data.budget_status === 'PENDING_FINANCE_APPROVAL' ? (
              <Button size="small" variant="contained" onClick={() => financeApprove(p.data.id)}>Approve Budget</Button>
            ) : null,
        }]
      : []),
  ];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Purchase Orders</Typography>
        {canCreate && (
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/purchase-orders/new')}>
            New Purchase Order
          </Button>
        )}
      </Stack>
      <DataTable rowData={orders} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} />
    </>
  );
}
