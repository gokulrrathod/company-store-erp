import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FormPage from '../components/FormPage.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { rejectedMaterialSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';

const ACTIONS = [
  { value: 'RETURN_TO_SUPPLIER', label: 'Return to Supplier' },
  { value: 'SCRAP', label: 'Scrap' },
  { value: 'REWORK', label: 'Rework' },
  { value: 'REPLACEMENT', label: 'Replacement' },
];

export default function RejectedMaterialFormPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(rejectedMaterialSchema),
    defaultValues: {
      supplier_id: '', item_id: '', batch_number: '', quantity: '',
      reason: '', qc_remarks: '', action_taken: '', disposal_date: '',
    },
  });

  useEffect(() => {
    api.get('/items').then((res) => setItems(res.data)).catch(() => setItems([]));
    api.get('/suppliers').then((res) => setSuppliers(res.data)).catch(() => setSuppliers([]));
  }, []);

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/rejected-materials', { ...values, supplier_id: values.supplier_id || null, disposal_date: values.disposal_date || null });
      navigate('/rejected-material');
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  return (
    <FormPage
      title="Log Rejection Entry"
      subtitle="SOP Section 5: Quarantine failed inspection lots and log disposal/return action."
      backTo="/rejected-material"
      formError={formError}
      actions={
        <>
          <Button onClick={() => navigate('/rejected-material')}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <RHFSelect
            name="supplier_id" control={control} label="Supplier"
            options={[{ id: '', name: '— None —' }, ...suppliers]} getLabel={(s) => s.name} getValue={(s) => s.id}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFSelect
            name="item_id" control={control} label="Item" required
            options={items} getLabel={(i) => `${i.code} — ${i.name}`} getValue={(i) => i.id}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="batch_number" control={control} label="Batch Number" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="quantity" control={control} label="Rejected Quantity" type="number" required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFSelect
            name="action_taken" control={control} label="Action Taken" required
            options={ACTIONS} getLabel={(a) => a.label} getValue={(a) => a.value}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="disposal_date" control={control} label="Disposal Date" type="date" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12}>
          <RHFTextField name="reason" control={control} label="Reason for Rejection" required multiline rows={2} />
        </Grid>
        <Grid item xs={12}>
          <RHFTextField name="qc_remarks" control={control} label="QC Remarks" multiline rows={2} />
        </Grid>
      </Grid>
    </FormPage>
  );
}
