import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
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

export default function EnquiriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

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

  const columnDefs = [
    { field: 'enquiry_number', headerName: 'Enquiry No.', minWidth: 140 },
    {
      field: 'customer_name',
      headerName: 'Customer',
      minWidth: 180,
      cellRenderer: (p) => (
        <div style={{ lineHeight: 1.35, padding: '6px 0' }}>
          <div style={{ fontWeight: 600 }}>{p.data.customer_name}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{p.data.mobile_number}</div>
        </div>
      ),
    },
    { field: 'product_requirement', headerName: 'Requirement', minWidth: 200, wrapText: true, autoHeight: true },
    { field: 'sales_representative', headerName: 'Sales Rep', minWidth: 140 },
    { field: 'quotation_amount', headerName: 'Quotation', type: 'numericColumn', minWidth: 120, valueFormatter: (p) => p.value ? `₹ ${Number(p.value).toLocaleString('en-IN')}` : '—' },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 160,
      pinned: 'right',
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color={statusColor[p.value]} />,
    },
    {
      headerName: 'View',
      minWidth: 70,
      maxWidth: 90,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: (p) => (
        <IconButton size="small" onClick={() => navigate(`/enquiries/${p.data.id}`)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

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
      <DataTable rowData={enquiries} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} rowHeight={48} fillHeight />

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
