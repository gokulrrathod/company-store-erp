import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, Stack, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Paper, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = { OPEN: 'default', PARTIALLY_RECEIVED: 'warning', CLOSED: 'success', AMENDED: 'error' };
const budgetStatusColor = { WITHIN_BUDGET: 'success', PENDING_FINANCE_APPROVAL: 'error', FINANCE_APPROVED: 'success' };
const isPastDue = (row) => row.expected_delivery_date && !row.actual_delivery_date && new Date(row.expected_delivery_date) < new Date();
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// A single pinned kebab menu instead of one grid column per action — stays reachable
// however many columns the table grows to, and however many actions get added later.
function RowActionsMenu({ row, options }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const available = options.filter((o) => o.show);
  if (!available.length) return null;

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {available.map((o) => (
          <MenuItem
            key={o.label}
            onClick={() => { setAnchorEl(null); o.onClick(row); }}
          >
            <ListItemIcon>{o.icon}</ListItemIcon>
            <ListItemText>{o.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function OrderCard({ order, actionsMenu }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: '10px', mb: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, flexWrap: 'wrap' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          <ReceiptLongIcon fontSize="small" />
        </Avatar>
        <Typography variant="subtitle1" fontWeight={700}>{order.po_number}</Typography>
        <Chip size="small" label={order.status.replace(/_/g, ' ')} color={statusColor[order.status]} />
        <Chip size="small" label={order.budget_status.replace(/_/g, ' ')} color={budgetStatusColor[order.budget_status]} />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="subtitle2" fontWeight={700}>₹ {Number(order.total_value).toLocaleString('en-IN')}</Typography>
        {actionsMenu}
      </Box>

      <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          Supplier: <strong style={{ color: 'inherit' }}>{order.supplier_name}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Dept / Project: <strong style={{ color: 'inherit' }}>{order.department || '—'} · {order.project_name || '—'}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Created By: <strong style={{ color: 'inherit' }}>{order.created_by}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Date: <strong style={{ color: 'inherit' }}>{new Date(order.created_at).toLocaleDateString()}</strong>
        </Typography>
      </Box>

      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: isPastDue(order) ? '#c62828' : 'text.secondary' }}>
          Expected: <strong style={{ color: 'inherit' }}>
            {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : '—'}
            {isPastDue(order) ? ' (delayed)' : ''}
          </strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Actual: <strong style={{ color: 'inherit' }}>
            {order.actual_delivery_date ? new Date(order.actual_delivery_date).toLocaleDateString() : 'Not received yet'}
          </strong>
        </Typography>
      </Box>
    </Paper>
  );
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const [amendTarget, setAmendTarget] = useState(null);
  const [amendDate, setAmendDate] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [amendError, setAmendError] = useState('');

  const load = () => {
    api.get('/purchase-orders').then((res) => setOrders(res.data)).catch(() => setOrders([]));
  };

  useEffect(load, []);

  const canCreate = ['PURCHASE', 'ADMIN'].includes(user?.role);
  const canFinanceApprove = ['FINANCE', 'ADMIN'].includes(user?.role);
  const canAmend = ['PURCHASE', 'ADMIN'].includes(user?.role);

  const financeApprove = async (id) => {
    await api.patch(`/purchase-orders/${id}/finance-approve`);
    load();
  };

  const openAmend = (row) => {
    setAmendTarget(row);
    setAmendDate(row.expected_delivery_date ? row.expected_delivery_date.slice(0, 10) : '');
    setAmendReason('');
    setAmendError('');
  };

  const submitAmend = async () => {
    setAmendError('');
    if (!amendReason.trim()) {
      setAmendError('An amendment reason is required.');
      return;
    }
    try {
      await api.patch(`/purchase-orders/${amendTarget.id}/amend`, {
        expected_delivery_date: amendDate || undefined,
        amendment_reason: amendReason,
      });
      setAmendTarget(null);
      load();
    } catch (err) {
      setAmendError(err?.response?.data?.error || 'Failed to amend');
    }
  };

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageOrders = useMemo(
    () => orders.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize),
    [orders, clampedPage, pageSize]
  );
  const rangeStart = orders.length === 0 ? 0 : clampedPage * pageSize + 1;
  const rangeEnd = Math.min(orders.length, clampedPage * pageSize + pageSize);

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Purchase Orders</Typography>
          {canCreate && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/purchase-orders/new')}>
              New Purchase Order
            </Button>
          )}
        </Stack>
      }
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
          {orders.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No purchase orders yet.</Typography>
          )}
          {pageOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              actionsMenu={(canFinanceApprove || canAmend) && (
                <RowActionsMenu
                  row={order}
                  options={[
                    {
                      label: 'Approve Budget', icon: <AccountBalanceIcon fontSize="small" />,
                      show: canFinanceApprove && order.budget_status === 'PENDING_FINANCE_APPROVAL',
                      onClick: (row) => financeApprove(row.id),
                    },
                    {
                      label: 'Amend', icon: <EditCalendarIcon fontSize="small" />,
                      show: canAmend && order.status !== 'CLOSED',
                      onClick: (row) => openAmend(row),
                    },
                  ]}
                />
              )}
            />
          ))}
        </Box>

        {orders.length > 0 && (
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
              {rangeStart} to {rangeEnd} of {orders.length}
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

      <Dialog open={!!amendTarget} onClose={() => setAmendTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Amend {amendTarget?.po_number}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {amendError && <Alert severity="error">{amendError}</Alert>}
            <TextField
              label="Revised Expected Delivery Date" type="date" InputLabelProps={{ shrink: true }}
              value={amendDate} onChange={(e) => setAmendDate(e.target.value)}
            />
            <TextField
              label="Amendment Reason" required multiline rows={3}
              value={amendReason} onChange={(e) => setAmendReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAmendTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitAmend}>Save Amendment</Button>
        </DialogActions>
      </Dialog>
    </ListPageLayout>
  );
}
