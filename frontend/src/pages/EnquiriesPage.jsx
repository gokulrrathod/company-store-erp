import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert, IconButton,
  Paper, Avatar, TextField, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import ListPageLayout from '../components/ListPageLayout.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import { enquirySchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = {
  NEW_ENQUIRY: 'default', QUOTATION_SENT: 'warning', WAITING_FOR_CUSTOMER: 'warning',
  UNDER_NEGOTIATION: 'warning', PRICE_APPROVED: 'success', ORDER_CONFIRMED: 'success',
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function EnquiryCard({ enquiry, onView }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: '10px', mb: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, flexWrap: 'wrap' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          <ContactMailIcon fontSize="small" />
        </Avatar>
        <Typography variant="subtitle1" fontWeight={700}>{enquiry.enquiry_number}</Typography>
        <Chip size="small" label={enquiry.status.replace(/_/g, ' ')} color={statusColor[enquiry.status]} />
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={() => onView(enquiry.id)} title="View enquiry">
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          Customer: <strong style={{ color: 'inherit' }}>{enquiry.customer_name}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Mobile: <strong style={{ color: 'inherit' }}>{enquiry.mobile_number}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sales Rep: <strong style={{ color: 'inherit' }}>{enquiry.sales_representative}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Date: <strong style={{ color: 'inherit' }}>{new Date(enquiry.enquiry_date).toLocaleDateString()}</strong>
        </Typography>
      </Box>

      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
          Requirement
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>{enquiry.product_requirement}</Typography>
      </Box>

      <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          {enquiry.company_name ? `Company: ${enquiry.company_name}` : ' '}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {enquiry.quotation_amount ? `Quotation: ₹ ${Number(enquiry.quotation_amount).toLocaleString('en-IN')}` : 'No quotation yet'}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function EnquiriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(enquirySchema),
    defaultValues: { customer_name: '', mobile_number: '', company_name: '', site_address: '', product_requirement: '', sales_representative: user?.name || '' },
  });

  const load = () => {
    api.get('/enquiries').then((res) => setEnquiries(res.data)).catch(() => setEnquiries([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ customer_name: '', mobile_number: '', company_name: '', site_address: '', product_requirement: '', sales_representative: user?.name || '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/enquiries', values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  const canCreate = ['SALES', 'ADMIN'].includes(user?.role);

  const totalPages = Math.max(1, Math.ceil(enquiries.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageEnquiries = useMemo(
    () => enquiries.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize),
    [enquiries, clampedPage, pageSize]
  );
  const rangeStart = enquiries.length === 0 ? 0 : clampedPage * pageSize + 1;
  const rangeEnd = Math.min(enquiries.length, clampedPage * pageSize + pageSize);

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Customer Enquiries</Typography>
          {canCreate && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
              New Enquiry
            </Button>
          )}
        </Stack>
      }
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
          {enquiries.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No enquiries recorded yet.</Typography>
          )}
          {pageEnquiries.map((e) => (
            <EnquiryCard key={e.id} enquiry={e} onView={(id) => navigate(`/enquiries/${id}`)} />
          ))}
        </Box>

        {enquiries.length > 0 && (
          <Box sx={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2,
            px: 1, py: 1, borderTop: '1px solid', borderColor: 'divider',
          }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">Page Size:</Typography>
              <TextField
                select size="small" value={pageSize}
                onChange={(ev) => { setPageSize(Number(ev.target.value)); setPage(0); }}
                sx={{ width: 90 }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {rangeStart} to {rangeEnd} of {enquiries.length}
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Customer Enquiry</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFTextField name="customer_name" control={control} label="Customer Name" required />
            <RHFTextField name="mobile_number" control={control} label="Mobile Number" required />
            <RHFTextField name="company_name" control={control} label="Company Name" />
            <RHFTextField name="site_address" control={control} label="Site Address" multiline rows={2} />
            <RHFTextField name="product_requirement" control={control} label="Product Requirement" required multiline rows={2} />
            <RHFTextField name="sales_representative" control={control} label="Sales Representative" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Create</Button>
        </DialogActions>
      </Dialog>
    </ListPageLayout>
  );
}
