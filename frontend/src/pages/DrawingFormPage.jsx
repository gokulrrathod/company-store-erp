import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid, Button, FormControlLabel, Checkbox, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FormPage from '../components/FormPage.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import { drawingSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';

export default function DrawingFormPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(drawingSchema),
    defaultValues: {
      drawing_number: '', drawing_title: '', project_reference: '', equipment_name: '',
      scale: '', material: '', weight: '', requires_customer_approval: false, checker: '', design_head: '',
    },
  });

  const onSubmit = async (values) => {
    setFormError('');
    try {
      const { data } = await api.post('/drawings', values);
      navigate(`/drawings/${data.id}`);
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  return (
    <FormPage
      title="New Drawing"
      subtitle="SOP Section 3: Design Input begins the drawing lifecycle — Engineer → Checker → Design Head → Customer → Released."
      backTo="/drawings"
      formError={formError}
      actions={
        <>
          <Button onClick={() => navigate('/drawings')}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            Create Drawing
          </Button>
        </>
      }
    >
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="drawing_number" control={control} label="Drawing Number" required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="drawing_title" control={control} label="Drawing Title" required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="equipment_name" control={control} label="Equipment Name" required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="project_reference" control={control} label="Project Reference" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <RHFTextField name="scale" control={control} label="Scale" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <RHFTextField name="material" control={control} label="Material" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <RHFTextField name="weight" control={control} label="Weight (kg)" type="number" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="checker" control={control} label="Assigned Checker" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField name="design_head" control={control} label="Assigned Design Head" />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="requires_customer_approval"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label="Requires Customer Approval before release"
              />
            )}
          />
        </Grid>
      </Grid>
      <Stack spacing={0.5} sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          After creation, add BOM lines and submit for checking. The Checker must complete all 13 verification
          checklist items before the drawing can move to Design Head approval.
        </Typography>
      </Stack>
    </FormPage>
  );
}
