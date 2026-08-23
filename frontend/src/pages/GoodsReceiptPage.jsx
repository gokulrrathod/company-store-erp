import { useEffect, useState } from 'react';
import { Box, Typography, Button, Stack, Chip, IconButton, Paper, Avatar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useNavigate } from 'react-router-dom';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = { PENDING_INSPECTION: 'warning', INSPECTED: 'default', APPROVED: 'success', REJECTED: 'error' };
const inspectionColor = { PENDING: 'warning', ACCEPTED: 'success', PARTIALLY_ACCEPTED: 'warning', REJECTED: 'error' };

function ReceiptCard({ receipt, onView }) {
  const lines = receipt.lines || [];
  return (
    <Paper variant="outlined" sx={{ borderRadius: '10px', mb: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, flexWrap: 'wrap' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          <LocalShippingIcon fontSize="small" />
        </Avatar>
        <Typography variant="subtitle1" fontWeight={700}>{receipt.grn_number}</Typography>
        {receipt.po_number && <Chip size="small" label={receipt.po_number} variant="outlined" />}
        <Chip size="small" label={receipt.status.replace(/_/g, ' ')} color={statusColor[receipt.status]} />
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={() => onView(receipt.id)} title="View / inspect">
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          Supplier: <strong style={{ color: 'inherit' }}>{receipt.supplier_name}</strong>
        </Typography>
        {receipt.invoice_number && (
          <Typography variant="body2" color="text.secondary">
            Invoice: <strong style={{ color: 'inherit' }}>{receipt.invoice_number}</strong>
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Received: <strong style={{ color: 'inherit' }}>{new Date(receipt.created_at).toLocaleDateString()}</strong>
        </Typography>
      </Box>

      {lines.length > 0 && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
            px: 2, py: 1,
            bgcolor: 'background.default',
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'text.secondary',
          }}>
            <span>Material</span>
            <span>Batch</span>
            <span>Received</span>
            <span>QC Status</span>
          </Box>
          {lines.map((line) => (
            <Box key={line.id} sx={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
              px: 2, py: 1,
              borderTop: '1px solid', borderColor: 'divider',
              alignItems: 'center',
            }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{line.item_name}</Typography>
                <Typography variant="caption" color="text.secondary">{line.item_code}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">{line.batch_number || '—'}</Typography>
              <Box>
                <Typography variant="body2" fontWeight={600}>{line.quantity_received} {line.unit}</Typography>
                {line.quantity_ordered && Number(line.quantity_received) < Number(line.quantity_ordered) && (
                  <Typography variant="caption" sx={{ color: '#D97706' }}>
                    {Number(line.quantity_ordered) - Number(line.quantity_received)} {line.unit} short of {line.quantity_ordered}
                  </Typography>
                )}
              </Box>
              <Chip size="small" label={line.inspection_status.replace(/_/g, ' ')} color={inspectionColor[line.inspection_status]} />
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">Receiver: {receipt.receiver_name}</Typography>
        <Typography variant="caption" color="text.secondary">{lines.length} material{lines.length === 1 ? '' : 's'} received</Typography>
      </Box>
    </Paper>
  );
}

export default function GoodsReceiptPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    api.get('/material-receipts').then((res) => setReceipts(res.data)).catch(() => setReceipts([]));
  }, []);

  const canCreate = ['STORE_EXECUTIVE', 'STORE_MANAGER', 'ADMIN'].includes(user?.role);

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Material Receiving &amp; Inspection (GRN)</Typography>
          {canCreate && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/goods-receipt/new')}>
              New Receipt
            </Button>
          )}
        </Stack>
      }
    >
      <Box sx={{ height: '100%', overflow: 'auto', pr: 0.5 }}>
        {receipts.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No receipts recorded yet.</Typography>
        )}
        {receipts.map((r) => (
          <ReceiptCard key={r.id} receipt={r} onView={(id) => navigate(`/goods-receipt/${id}`)} />
        ))}
      </Box>
    </ListPageLayout>
  );
}
