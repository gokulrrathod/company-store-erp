import { useEffect, useState } from 'react';
import { Typography, Button, Stack, Chip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = { PENDING_INSPECTION: 'warning', INSPECTED: 'default', APPROVED: 'success', REJECTED: 'error' };

export default function GoodsReceiptPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    api.get('/material-receipts').then((res) => setReceipts(res.data)).catch(() => setReceipts([]));
  }, []);

  const canCreate = ['STORE_EXECUTIVE', 'STORE_MANAGER', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'grn_number', headerName: 'GRN No.', minWidth: 140 },
    { field: 'po_number', headerName: 'PO No.', minWidth: 140, valueGetter: (p) => p.data.po_number || '—' },
    { field: 'supplier_name', headerName: 'Supplier', minWidth: 180 },
    { field: 'receiver_name', headerName: 'Receiver', minWidth: 150 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 170,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={statusColor[p.value]} />,
    },
    { field: 'created_at', headerName: 'Date', minWidth: 120, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    {
      headerName: 'View',
      minWidth: 70,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (p) => (
        <IconButton size="small" onClick={() => navigate(`/goods-receipt/${p.data.id}`)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Material Receiving &amp; Inspection (GRN)</Typography>
        {canCreate && (
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/goods-receipt/new')}>
            New Receipt
          </Button>
        )}
      </Stack>
      <DataTable rowData={receipts} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} />
    </>
  );
}
