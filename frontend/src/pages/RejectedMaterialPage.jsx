import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, Stack, Chip, Paper, Avatar, TextField, MenuItem, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function RejectionCard({ rejection }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: '10px', mb: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, flexWrap: 'wrap' }}>
        <Avatar sx={{ bgcolor: 'warning.main', width: 36, height: 36 }}>
          <ReportProblemIcon fontSize="small" />
        </Avatar>
        <Typography variant="subtitle1" fontWeight={700}>{rejection.rejection_number}</Typography>
        <Chip size="small" label={rejection.action_taken.replace(/_/g, ' ')} color="warning" />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {rejection.disposal_date ? `Disposed ${new Date(rejection.disposal_date).toLocaleDateString()}` : 'Not disposed yet'}
        </Typography>
      </Box>

      <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          Item: <strong style={{ color: 'inherit' }}>{rejection.item_code} — {rejection.item_name}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supplier / Batch: <strong style={{ color: 'inherit' }}>{rejection.supplier_name || '—'} · {rejection.batch_number || '—'}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Quantity: <strong style={{ color: 'inherit' }}>{rejection.quantity}</strong>
        </Typography>
      </Box>

      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
          Reason
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>{rejection.reason}</Typography>
      </Box>
    </Paper>
  );
}

export default function RejectedMaterialPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rejections, setRejections] = useState([]);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  useEffect(() => {
    api.get('/rejected-materials').then((res) => setRejections(res.data)).catch(() => setRejections([]));
  }, []);

  const canCreate = ['QUALITY', 'STORE_MANAGER', 'ADMIN'].includes(user?.role);

  const totalPages = Math.max(1, Math.ceil(rejections.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageRejections = useMemo(
    () => rejections.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize),
    [rejections, clampedPage, pageSize]
  );
  const rangeStart = rejections.length === 0 ? 0 : clampedPage * pageSize + 1;
  const rangeEnd = Math.min(rejections.length, clampedPage * pageSize + pageSize);

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
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
          {rejections.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No rejections logged yet.</Typography>
          )}
          {pageRejections.map((r) => (
            <RejectionCard key={r.id} rejection={r} />
          ))}
        </Box>

        {rejections.length > 0 && (
          <Box sx={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2,
            px: 1, py: 1, borderTop: '1px solid', borderColor: 'divider',
          }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">Page Size:</Typography>
              <TextField
                select size="small" value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                sx={{ width: 90 }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {rangeStart} to {rangeEnd} of {rejections.length}
            </Typography>
            <IconButton size="small" disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" color="text.secondary">Page {clampedPage + 1} of {totalPages}</Typography>
            <IconButton size="small" disabled={clampedPage >= totalPages - 1} onClick={() => setPage(clampedPage + 1)}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
    </ListPageLayout>
  );
}
