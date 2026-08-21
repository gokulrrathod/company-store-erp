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
import { purchaseOrderSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';

const DEPARTMENTS = ['Purchase', 'Production', 'Store', 'Sales', 'Civil'];

export default function PurchaseOrderFormPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, setError,
    formState: { isSubmitting, errors },
  } = useForm({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: { po_number: '', supplier_id: '', department: '', lines: [{ item_id: '', quantity_ordered: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  useEffect(() => {
    api.get('/items').then((res) => setItems(res.data)).catch(() => setItems([]));
    api.get('/suppliers').then((res) => setSuppliers(res.data)).catch(() => setSuppliers([]));
  }, []);

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/purchase-orders', values);
      navigate('/purchase-orders');
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  return (
    <FormPage
      title="New Purchase Order"
      subtitle="SOP Section 9: Purchase Order is the first step of the receiving workflow."
      backTo="/purchase-orders"
      formError={formError}
      actions={
        <>
          <Button onClick={() => navigate('/purchase-orders')}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            Create Purchase Order
          </Button>
        </>
      }
    >
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="po_number" control={control} label="PO Number" required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFSelect
            name="supplier_id" control={control} label="Supplier" required
            options={suppliers} getLabel={(s) => s.name} getValue={(s) => s.id}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFSelect
            name="department" control={control} label="Department" required
            options={DEPARTMENTS} getLabel={(d) => d} getValue={(d) => d}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle1" fontWeight={700}>Line Items</Typography>
      {errors.lines?.root && <Typography variant="caption" color="error">{errors.lines.root.message}</Typography>}
      {errors.lines?.message && <Typography variant="caption" color="error">{errors.lines.message}</Typography>}

      <Stack spacing={2}>
        {fields.map((field, idx) => (
          <Stack direction="row" spacing={1.5} key={field.id} alignItems="flex-start">
            <RHFSelect
              name={`lines.${idx}.item_id`} control={control} label="Item" required
              options={items} getLabel={(i) => `${i.code} — ${i.name}`} getValue={(i) => i.id}
              sx={{ flex: 2 }}
            />
            <RHFTextField
              name={`lines.${idx}.quantity_ordered`} control={control} label="Quantity" type="number" required
              sx={{ flex: 1 }}
            />
            <IconButton color="error" onClick={() => remove(idx)} disabled={fields.length === 1} sx={{ mt: 1 }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        <Button
          startIcon={<AddIcon />}
          onClick={() => append({ item_id: '', quantity_ordered: '' })}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add Line
        </Button>
      </Stack>
    </FormPage>
  );
}
