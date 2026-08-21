import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, Button, Stack, Alert, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DataTable from '../components/DataTable.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = { PENDING_INSPECTION: 'warning', INSPECTED: 'default', APPROVED: 'success', REJECTED: 'error' };
const inspectionColor = { PENDING: 'warning', ACCEPTED: 'success', PARTIALLY_ACCEPTED: 'warning', REJECTED: 'error' };

export default function MaterialReceiptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = () => {
    api.get(`/material-receipts/${id}`).then((res) => setDetail(res.data)).catch(() => setDetail(null));
  };

  useEffect(load, [id]);

  const inspectLine = async (lineId, inspection_status) => {
    setActionError('');
    try {
      await api.patch(`/material-receipts/${id}/lines/${lineId}/inspect`, { inspection_status });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update inspection status');
    }
  };

  const approve = async () => {
    setActionError('');
    try {
      await api.post(`/material-receipts/${id}/approve`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to approve receipt');
    }
  };

  if (!detail) return <Typography>Loading...</Typography>;

  const canInspect = ['QUALITY', 'ADMIN'].includes(user?.role);
  const canApprove = ['STORE_MANAGER', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'item_code', headerName: 'Code', minWidth: 100 },
    { field: 'item_name', headerName: 'Item', minWidth: 180 },
    { field: 'batch_number', headerName: 'Batch', minWidth: 120, valueGetter: (p) => p.data.batch_number || '—' },
    { field: 'expiry_date', headerName: 'Expiry', minWidth: 110, valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : '—' },
    { field: 'quantity_received', headerName: 'Qty Received', type: 'numericColumn', minWidth: 130 },
    {
      field: 'inspection_status',
      headerName: 'Inspection',
      minWidth: 150,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={inspectionColor[p.value]} />,
    },
    ...(canInspect && detail.status !== 'APPROVED'
      ? [{
          headerName: 'Actions',
          minWidth: 220,
          sortable: false,
          filter: false,
          cellRenderer: (p) => (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" color="success" onClick={() => inspectLine(p.data.id, 'ACCEPTED')}>Accept</Button>
              <Button size="small" color="warning" onClick={() => inspectLine(p.data.id, 'PARTIALLY_ACCEPTED')}>Partial</Button>
              <Button size="small" color="error" onClick={() => inspectLine(p.data.id, 'REJECTED')}>Reject</Button>
            </Stack>
          ),
        }]
      : []),
  ];

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate('/goods-receipt')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>{detail.grn_number}</Typography>
        <Chip size="small" label={detail.status} color={statusColor[detail.status]} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ ml: 5, mb: 2 }}>
        Supplier: {detail.supplier_name} · Invoice: {detail.invoice_number || '—'} · Received by: {detail.receiver_name}
        {detail.approved_by && ` · Approved by: ${detail.approved_by}`}
      </Typography>

      {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}

      <DataTable
        rowData={detail.lines}
        columnDefs={columnDefs}
        pagination={false}
        height={Math.max(160, detail.lines.length * 56 + 60)}
        getRowId={(p) => String(p.data.id)}
      />

      {canApprove && detail.status !== 'APPROVED' && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={approve}
            disabled={detail.lines.some((l) => l.inspection_status === 'PENDING')}
          >
            Approve &amp; Update Inventory
          </Button>
        </Stack>
      )}
    </Box>
  );
}
