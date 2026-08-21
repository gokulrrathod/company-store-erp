import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid, Button, IconButton, Typography, Stack, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import FormPage from '../components/FormPage.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { materialReceiptSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';

export default function MaterialReceiptFormPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, setError,
    formState: { isSubmitting, errors },
  } = useForm({
    resolver: zodResolver(materialReceiptSchema),
    defaultValues: {
      po_id: '', supplier_id: '', invoice_number: '',
      lines: [{ item_id: '', batch_number: '', expiry_date: '', quantity_received: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  useEffect(() => {
    api.get('/items').then((res) => setItems(res.data)).catch(() => setItems([]));
    api.get('/suppliers').then((res) => setSuppliers(res.data)).catch(() => setSuppliers([]));
    api.get('/purchase-orders').then((res) => setPurchaseOrders(res.data)).catch(() => setPurchaseOrders([]));
  }, []);

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/material-receipts', { ...values, po_id: values.po_id || null });
      navigate('/goods-receipt');
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  return (
    <FormPage
      title="New Material Receipt"
      subtitle="SOP Section 1: Capture supplier invoice, batch, and quantity received for inspection."
      backTo="/goods-receipt"
      formError={formError}
      actions={
        <>
          <Button onClick={() => navigate('/goods-receipt')}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            Save Receipt
          </Button>
        </>
      }
    >
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={4}>
          <RHFSelectWithNone
            name="po_id" control={control} label="Purchase Order (optional)"
            options={purchaseOrders} getLabel={(po) => `${po.po_number} — ${po.supplier_name}`} getValue={(po) => po.id}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <RHFSelect
            name="supplier_id" control={control} label="Supplier" required
            options={suppliers} getLabel={(s) => s.name} getValue={(s) => s.id}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <RHFTextField name="invoice_number" control={control} label="Invoice Number" />
        </Grid>
      </Grid>

      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle1" fontWeight={700}>Received Items</Typography>
      {errors.lines?.message && <Typography variant="caption" color="error">{errors.lines.message}</Typography>}

      <Stack spacing={2}>
        {fields.map((field, idx) => (
          <Grid container spacing={1.5} key={field.id} alignItems="flex-start">
            <Grid item xs={12} sm={3}>
              <RHFSelect
                name={`lines.${idx}.item_id`} control={control} label="Item" required
                options={items} getLabel={(i) => `${i.code} — ${i.name}`} getValue={(i) => i.id}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <RHFTextField name={`lines.${idx}.batch_number`} control={control} label="Batch Number" />
            </Grid>
            <Grid item xs={12} sm={2.5}>
              <RHFTextField name={`lines.${idx}.expiry_date`} control={control} label="Expiry Date" type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={2.5}>
              <RHFTextField name={`lines.${idx}.quantity_received`} control={control} label="Qty Received" type="number" required />
            </Grid>
            <Grid item xs={12} sm={1}>
              <IconButton color="error" onClick={() => remove(idx)} disabled={fields.length === 1}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Grid>
          </Grid>
        ))}
        <Button
          startIcon={<AddIcon />}
          onClick={() => append({ item_id: '', batch_number: '', expiry_date: '', quantity_received: '' })}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add Item
        </Button>
      </Stack>
    </FormPage>
  );
}

function RHFSelectWithNone({ name, control, label, options, getLabel, getValue, ...props }) {
  return (
    <RHFSelect name={name} control={control} label={label} options={[{ __none: true }, ...options]}
      getLabel={(o) => (o.__none ? '— None —' : getLabel(o))}
      getValue={(o) => (o.__none ? '' : getValue(o))}
      {...props}
    />
  );
}
