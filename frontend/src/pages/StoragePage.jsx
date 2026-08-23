import { useEffect, useState } from 'react';
import { Typography, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function StoragePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/items').then((res) => setItems(res.data)).catch(() => setItems([]));
  }, []);

  const canManage = ['STORE_MANAGER', 'STORE_EXECUTIVE', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    {
      field: 'name',
      headerName: 'Material Info',
      minWidth: 220,
      cellRenderer: (p) => (
        <div style={{ lineHeight: 1.35, padding: '6px 0' }}>
          <div style={{ fontWeight: 600 }}>{p.data.name}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{p.data.code} &middot; {p.data.category_name}</div>
        </div>
      ),
    },
    {
      headerName: 'Storage Location',
      valueGetter: (p) => [p.data.warehouse, p.data.rack_number, p.data.bin_number].filter(Boolean).join(' / '),
      minWidth: 180,
    },
    { field: 'quantity', headerName: 'Current Stock', type: 'numericColumn', minWidth: 120 },
    { field: 'minimum_stock', headerName: 'Min', type: 'numericColumn', minWidth: 90 },
    { field: 'maximum_stock', headerName: 'Max', type: 'numericColumn', minWidth: 90 },
    { field: 'reorder_level', headerName: 'Reorder', type: 'numericColumn', minWidth: 100 },
    { field: 'unit_rate', headerName: 'Unit Rate', type: 'numericColumn', minWidth: 100, valueFormatter: (p) => `₹ ${p.value}` },
    ...(canManage
      ? [{
          headerName: 'Edit',
          minWidth: 70,
          maxWidth: 100,
          pinned: 'right',
          sortable: false,
          filter: false,
          cellRenderer: (p) => (
            <IconButton size="small" onClick={() => navigate(`/storage/${p.data.id}/edit`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          ),
        }]
      : []),
  ];

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Material Master &amp; Rack/Bin Storage</Typography>
          {canManage && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/storage/new')}>
              Add Material / Storage Bin
            </Button>
          )}
        </Stack>
      }
    >
      <DataTable rowData={items} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} rowHeight={48} fillHeight />
    </ListPageLayout>
  );
}
