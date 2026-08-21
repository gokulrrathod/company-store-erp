import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { vendorSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const VENDOR_TYPES = [
  { value: 'MATERIAL_SUPPLIER', label: 'Material Supplier' },
  { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
];

const statusColor = {
  PENDING_VERIFICATION: 'warning', PENDING_FINANCE_VERIFICATION: 'warning', PENDING_MANAGEMENT_APPROVAL: 'warning',
  ACTIVE: 'success', REJECTED: 'error', INACTIVE: 'default', BLACKLISTED: 'error',
};

export default function VendorsPage() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: { name: '', contact_person: '', phone: '', email: '', vendor_type: 'MATERIAL_SUPPLIER', vendor_category: '', gst_number: '', pan_number: '', bank_account_details: '' },
  });

  const load = () => {
    api.get('/suppliers').then((res) => setVendors(res.data)).catch(() => setVendors([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ name: '', contact_person: '', phone: '', email: '', vendor_type: 'MATERIAL_SUPPLIER', vendor_category: '', gst_number: '', pan_number: '', bank_account_details: '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/suppliers', values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  const purchaseVerify = async (id) => { await api.patch(`/suppliers/${id}/purchase-verify`); load(); };
  const financeVerify = async (id) => { await api.patch(`/suppliers/${id}/finance-verify`); load(); };
  const approve = async (id, status) => { await api.patch(`/suppliers/${id}/approve`, { status }); load(); };

  const canCreate = ['PURCHASE', 'ADMIN'].includes(user?.role);
  const canPurchaseVerify = ['PURCHASE', 'ADMIN'].includes(user?.role);
  const canFinanceVerify = ['FINANCE', 'ADMIN'].includes(user?.role);
  const canApprove = ['MANAGEMENT', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'name', headerName: 'Vendor Name', minWidth: 180 },
    { field: 'vendor_type', headerName: 'Type', minWidth: 150, valueFormatter: (p) => p.value.replace(/_/g, ' ') },
    { field: 'gst_number', headerName: 'GST No.', minWidth: 150, valueFormatter: (p) => p.value || '—' },
    { field: 'vendor_rating', headerName: 'Rating', type: 'numericColumn', minWidth: 90, valueFormatter: (p) => p.value ?? '—' },
    {
      field: 'vendor_status',
      headerName: 'Status',
      minWidth: 210,
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color={statusColor[p.value]} />,
    },
    {
      headerName: 'Actions',
      minWidth: 160,
      sortable: false,
      filter: false,
      cellRenderer: (p) => {
        if (p.data.vendor_status === 'PENDING_VERIFICATION' && canPurchaseVerify) {
          return <Button size="small" onClick={() => purchaseVerify(p.data.id)}>Purchase Verify</Button>;
        }
        if (p.data.vendor_status === 'PENDING_FINANCE_VERIFICATION') {
          const actions = [];
          if (canFinanceVerify) actions.push(<Button key="fv" size="small" onClick={() => financeVerify(p.data.id)}>Finance Verify</Button>);
          if (canApprove) actions.push(<Button key="ap" size="small" color="success" onClick={() => approve(p.data.id, 'APPROVED')}>Approve</Button>);
          return <Stack direction="row" spacing={0.5}>{actions}</Stack>;
        }
        if (p.data.vendor_status === 'PENDING_MANAGEMENT_APPROVAL' && canApprove) {
          return (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" color="success" onClick={() => approve(p.data.id, 'APPROVED')}>Approve</Button>
              <Button size="small" color="error" onClick={() => approve(p.data.id, 'REJECTED')}>Reject</Button>
            </Stack>
          );
        }
        return null;
      },
    },
  ];

  return (
    <ListPageLayout
      header={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Vendor Master</Typography>
          {canCreate && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
              Register Vendor
            </Button>
          )}
        </Stack>
      }
    >
      <DataTable rowData={vendors} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} fillHeight />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Register Vendor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFTextField name="name" control={control} label="Vendor Name" required />
            <RHFSelect name="vendor_type" control={control} label="Vendor Type" required options={VENDOR_TYPES} getLabel={(t) => t.label} getValue={(t) => t.value} />
            <RHFTextField name="vendor_category" control={control} label="Vendor Category" />
            <RHFTextField name="gst_number" control={control} label="GST Number" required />
            <RHFTextField name="pan_number" control={control} label="PAN Number" required />
            <RHFTextField name="contact_person" control={control} label="Contact Person" />
            <RHFTextField name="phone" control={control} label="Phone" />
            <RHFTextField name="email" control={control} label="Email" type="email" />
            <RHFTextField name="bank_account_details" control={control} label="Bank Account Details" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Register</Button>
        </DialogActions>
      </Dialog>
    </ListPageLayout>
  );
}
