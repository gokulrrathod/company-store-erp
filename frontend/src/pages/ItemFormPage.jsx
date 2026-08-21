import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid, Button } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import FormPage from '../components/FormPage.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { itemSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';

const UNITS = ['pcs', 'kg', 'ltr', 'pair', 'box', 'set', 'meter'];

export default function ItemFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [categories, setCategories] = useState([]);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      code: '', name: '', category_id: '', unit: 'pcs', quantity: 0,
      reorder_level: 0, minimum_stock: 0, maximum_stock: '', warehouse: '',
      rack_number: '', bin_number: '', storage_location: '', unit_rate: 0,
    },
  });

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (isEdit) {
      api.get(`/items/${id}`).then((res) => reset({ ...res.data, category_id: res.data.category_id ?? '' }));
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (values) => {
    setFormError('');
    const payload = { ...values, category_id: values.category_id || null, maximum_stock: values.maximum_stock === '' ? null : values.maximum_stock };
    try {
      if (isEdit) {
        await api.put(`/items/${id}`, payload);
      } else {
        await api.post('/items', payload);
      }
      navigate('/storage');
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  return (
    <FormPage
      title={isEdit ? 'Edit Material Storage' : 'New Material Master & Bin Mapping'}
      subtitle="Define storage warehouse, rack/bin, and stock thresholds."
      backTo="/storage"
      formError={formError}
      actions={
        <>
          <Button onClick={() => navigate('/storage')}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Create Material'}
          </Button>
        </>
      }
    >
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="code" control={control} label="Material Code" required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="name" control={control} label="Material Name" required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFSelect
            name="category_id" control={control} label="Category"
            options={categories} getLabel={(c) => c.name} getValue={(c) => c.id}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFSelect
            name="unit" control={control} label="Unit" required
            options={UNITS} getLabel={(u) => u} getValue={(u) => u}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="warehouse" control={control} label="Warehouse" />
        </Grid>
        <Grid item xs={12} sm={3}>
          <RHFTextField name="rack_number" control={control} label="Rack Number" />
        </Grid>
        <Grid item xs={12} sm={3}>
          <RHFTextField name="bin_number" control={control} label="Bin Number" />
        </Grid>
        <Grid item xs={12}>
          <RHFTextField name="storage_location" control={control} label="Storage Location (free text)" />
        </Grid>
        {!isEdit && (
          <Grid item xs={12} sm={4}>
            <RHFTextField name="quantity" control={control} label="Opening Quantity" type="number" />
          </Grid>
        )}
        <Grid item xs={12} sm={4}>
          <RHFTextField name="minimum_stock" control={control} label="Minimum Stock" type="number" required />
        </Grid>
        <Grid item xs={12} sm={4}>
          <RHFTextField name="maximum_stock" control={control} label="Maximum Stock" type="number" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <RHFTextField name="reorder_level" control={control} label="Reorder Level" type="number" required />
        </Grid>
        <Grid item xs={12} sm={4}>
          <RHFTextField name="unit_rate" control={control} label="Unit Rate (₹)" type="number" required />
        </Grid>
      </Grid>
    </FormPage>
  );
}
