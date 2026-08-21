import { useEffect, useState } from 'react';
import { Typography, Button, Stack, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function RejectedMaterialPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rejections, setRejections] = useState([]);

  useEffect(() => {
    api.get('/rejected-materials').then((res) => setRejections(res.data)).catch(() => setRejections([]));
  }, []);

  const canCreate = ['QUALITY', 'STORE_MANAGER', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'rejection_number', headerName: 'Rejection No.', minWidth: 140 },
    { field: 'supplier_name', headerName: 'Supplier', minWidth: 160, valueGetter: (p) => p.data.supplier_name || '—' },
    { headerName: 'Item', minWidth: 180, valueGetter: (p) => `${p.data.item_code} — ${p.data.item_name}` },
    { field: 'batch_number', headerName: 'Batch', minWidth: 120, valueGetter: (p) => p.data.batch_number || '—' },
    { field: 'quantity', headerName: 'Quantity', type: 'numericColumn', minWidth: 110 },
    { field: 'reason', headerName: 'Reason', minWidth: 220 },
    {
      field: 'action_taken',
      headerName: 'Action Taken',
      minWidth: 160,
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color="warning" />,
    },
    { field: 'disposal_date', headerName: 'Disposal Date', minWidth: 130, valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : '—' },
  ];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Rejected Material &amp; Vendor Return Register</Typography>
        {canCreate && (
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/rejected-material/new')}>
            Log Rejection Entry
          </Button>
        )}
      </Stack>
      <DataTable rowData={rejections} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} />
    </>
  );
}
