import { useEffect, useState } from 'react';
import { Typography, Button, Stack, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
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
    {
      field: 'supplier_name',
      headerName: 'Supplier / Batch',
      minWidth: 180,
      cellRenderer: (p) => (
        <div style={{ lineHeight: 1.35, padding: '6px 0' }}>
          <div style={{ fontWeight: 600 }}>{p.data.supplier_name || '—'}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Batch {p.data.batch_number || '—'}</div>
        </div>
      ),
    },
    { headerName: 'Item', minWidth: 180, valueGetter: (p) => `${p.data.item_code} — ${p.data.item_name}` },
    { field: 'quantity', headerName: 'Quantity', type: 'numericColumn', minWidth: 110 },
    { field: 'reason', headerName: 'Reason', minWidth: 200, wrapText: true, autoHeight: true },
    {
      field: 'action_taken',
      headerName: 'Action Taken',
      minWidth: 160,
      pinned: 'right',
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color="warning" />,
    },
    { field: 'disposal_date', headerName: 'Disposal Date', minWidth: 130, pinned: 'right', valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : '—' },
  ];

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Rejected Material &amp; Vendor Return Register</Typography>
          {canCreate && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/rejected-material/new')}>
              Log Rejection Entry
            </Button>
          )}
        </Stack>
      }
    >
      <DataTable rowData={rejections} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} rowHeight={48} fillHeight />
    </ListPageLayout>
  );
}
