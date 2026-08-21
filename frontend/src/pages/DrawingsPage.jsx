import { useEffect, useState } from 'react';
import { Typography, Button, Stack, Chip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = {
  DRAFT: 'default', UNDER_CHECKING: 'warning', REWORK: 'error', CHECKER_APPROVED: 'warning',
  DESIGN_HEAD_APPROVED: 'warning', AWAITING_CUSTOMER_APPROVAL: 'warning', CUSTOMER_APPROVED: 'warning',
  RELEASED: 'success',
};

export default function DrawingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drawings, setDrawings] = useState([]);

  useEffect(() => {
    api.get('/drawings').then((res) => setDrawings(res.data)).catch(() => setDrawings([]));
  }, []);

  const canCreate = ['DESIGN_ENGINEER', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'drawing_number', headerName: 'Drawing No.', minWidth: 140 },
    { field: 'drawing_title', headerName: 'Title', minWidth: 200 },
    { field: 'equipment_name', headerName: 'Equipment', minWidth: 160 },
    { field: 'revision', headerName: 'Rev', minWidth: 70 },
    { field: 'prepared_by', headerName: 'Prepared By', minWidth: 150 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 210,
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
        <IconButton size="small" onClick={() => navigate(`/drawings/${p.data.id}`)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Drawings</Typography>
          {canCreate && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/drawings/new')}>
              New Drawing
            </Button>
          )}
        </Stack>
      }
    >
      <DataTable rowData={drawings} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} fillHeight />
    </ListPageLayout>
  );
}
