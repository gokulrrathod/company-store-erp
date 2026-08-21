import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert, IconButton, Tabs, Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { purchaseInvoiceSchema, salesInvoiceSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = { PENDING: 'warning', PARTIAL: 'warning', PAID: 'success' };

export default function InvoicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [tab, setTab] = useState('PURCHASE');
  const [openPurchase, setOpenPurchase] = useState(false);
  const [openSales, setOpenSales] = useState(false);
  const [formError, setFormError] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [eligibleGrns, setEligibleGrns] = useState([]);

  const load = () => {
    api.get('/invoices').then((res) => setInvoices(res.data)).catch(() => setInvoices([]));
  };

  useEffect(load, []);
  useEffect(() => {
    api.get('/purchase-orders').then((res) => setPurchaseOrders(res.data)).catch(() => setPurchaseOrders([]));
    api.get('/sales-orders').then((res) => setSalesOrders(res.data)).catch(() => setSalesOrders([]));
  }, []);

  const purchaseForm = useForm({
    resolver: zodResolver(purchaseInvoiceSchema),
    defaultValues: { party_name: '', gstin: '', purchase_order_id: '', material_receipt_id: '', taxable_amount: '', gst_percent: 18, due_date: '' },
  });
  const salesForm = useForm({
    resolver: zodResolver(salesInvoiceSchema),
    defaultValues: { sales_order_id: '', gstin: '', taxable_amount: '', gst_percent: 18, due_date: '' },
  });

  const selectedPoId = purchaseForm.watch('purchase_order_id');
  useEffect(() => {
    if (!selectedPoId) { setEligibleGrns([]); return; }
    api.get(`/invoices/eligible-grns/${selectedPoId}`).then((res) => setEligibleGrns(res.data)).catch(() => setEligibleGrns([]));
  }, [selectedPoId]);

  const openPurchaseDialog = () => {
    setFormError('');
    purchaseForm.reset({ party_name: '', gstin: '', purchase_order_id: '', material_receipt_id: '', taxable_amount: '', gst_percent: 18, due_date: '' });
    setOpenPurchase(true);
  };
  const openSalesDialog = () => {
    setFormError('');
    salesForm.reset({ sales_order_id: '', gstin: '', taxable_amount: '', gst_percent: 18, due_date: '' });
    setOpenSales(true);
  };

  const submitPurchase = async (values) => {
    setFormError('');
    try {
      await api.post('/invoices/purchase', values);
      setOpenPurchase(false);
      load();
    } catch (err) {
      applyServerErrors(err, purchaseForm.setError, setFormError);
    }
  };
  const submitSales = async (values) => {
    setFormError('');
    try {
      await api.post('/invoices/sales', values);
      setOpenSales(false);
      load();
    } catch (err) {
      applyServerErrors(err, salesForm.setError, setFormError);
    }
  };

  const canCreate = ['ACCOUNTS', 'ADMIN'].includes(user?.role);
  const filtered = invoices.filter((i) => i.invoice_type === tab);

  const columnDefs = [
    { field: 'invoice_number', headerName: 'Invoice No.', minWidth: 150 },
    { field: 'party_name', headerName: 'Party', minWidth: 180 },
    { field: tab === 'PURCHASE' ? 'po_number' : 'so_number', headerName: tab === 'PURCHASE' ? 'PO No.' : 'SO No.', minWidth: 130, valueFormatter: (p) => p.value || '—' },
    { field: 'total_amount', headerName: 'Total', type: 'numericColumn', minWidth: 120, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'balance', headerName: 'Balance', type: 'numericColumn', minWidth: 120, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    {
      field: 'payment_status',
      headerName: 'Status',
      minWidth: 120,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={statusColor[p.value]} />,
    },
    {
      headerName: 'View',
      minWidth: 70,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (p) => (
        <IconButton size="small" onClick={() => navigate(`/invoices/${p.data.id}`)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Invoices & Payments</Typography>
        {canCreate && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={openPurchaseDialog}>Purchase Invoice</Button>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openSalesDialog}>Sales Invoice</Button>
          </Stack>
        )}
      </Stack>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="PURCHASE" label="Purchase Invoices" />
        <Tab value="SALES" label="Sales Invoices" />
      </Tabs>

      <DataTable rowData={filtered} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} />

      <Dialog open={openPurchase} onClose={() => setOpenPurchase(false)} fullWidth maxWidth="sm">
        <DialogTitle>Book Purchase Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Alert severity="info">Three-way match: the selected GRN must be Approved (post-inspection) against the selected PO. Invoice number is auto-generated.</Alert>
            <RHFTextField name="party_name" control={purchaseForm.control} label="Party (Vendor) Name" required />
            <RHFTextField name="gstin" control={purchaseForm.control} label="GSTIN" />
            <RHFSelect name="purchase_order_id" control={purchaseForm.control} label="Purchase Order" required options={purchaseOrders} getLabel={(o) => o.po_number} getValue={(o) => o.id} />
            <RHFSelect name="material_receipt_id" control={purchaseForm.control} label="GRN (Approved only)" required options={eligibleGrns} getLabel={(g) => g.grn_number} getValue={(g) => g.id} />
            <RHFTextField name="taxable_amount" control={purchaseForm.control} label="Taxable Amount (₹)" type="number" required />
            <RHFTextField name="gst_percent" control={purchaseForm.control} label="GST %" type="number" />
            <RHFTextField name="due_date" control={purchaseForm.control} label="Due Date" type="date" InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPurchase(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={purchaseForm.handleSubmit(submitPurchase)} disabled={purchaseForm.formState.isSubmitting}>Book Invoice</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openSales} onClose={() => setOpenSales(false)} fullWidth maxWidth="sm">
        <DialogTitle>Raise Sales Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFSelect name="sales_order_id" control={salesForm.control} label="Sales Order" required options={salesOrders} getLabel={(o) => `${o.so_number} — ${o.customer_name}`} getValue={(o) => o.id} />
            <RHFTextField name="gstin" control={salesForm.control} label="GSTIN" />
            <RHFTextField name="taxable_amount" control={salesForm.control} label="Taxable Amount (₹)" type="number" required />
            <RHFTextField name="gst_percent" control={salesForm.control} label="GST %" type="number" />
            <RHFTextField name="due_date" control={salesForm.control} label="Due Date" type="date" InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSales(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={salesForm.handleSubmit(submitSales)} disabled={salesForm.formState.isSubmitting}>Raise Invoice</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
