import { useEffect, useState } from 'react';
import { Typography, Chip, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';

const statusColor = {
  ORDER_CONFIRMED: 'default', IN_PRODUCTION: 'warning', PRODUCTION_COMPLETED: 'warning',
  READY_FOR_DISPATCH: 'warning', DISPATCHED: 'success', DELIVERED: 'success',
};

export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get('/sales-orders').then((res) => setOrders(res.data)).catch(() => setOrders([]));
  }, []);

  const columnDefs = [
    { field: 'so_number', headerName: 'SO Number', minWidth: 140 },
    { field: 'customer_name', headerName: 'Customer', minWidth: 180 },
    { field: 'approved_price', headerName: 'Order Value', type: 'numericColumn', minWidth: 130, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'balance_amount', headerName: 'Balance', type: 'numericColumn', minWidth: 120, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 170,
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color={statusColor[p.value]} />,
    },
    { field: 'created_at', headerName: 'Date', minWidth: 120, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    {
      headerName: 'View',
      minWidth: 70,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (p) => (
        <IconButton size="small" onClick={() => navigate(`/sales-orders/${p.data.id}`)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <ListPageLayout header={<Typography variant="h5">Sales Orders</Typography>}>
      <DataTable rowData={orders} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} fillHeight />
    </ListPageLayout>
  );
}
