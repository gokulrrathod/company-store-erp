import { Controller } from 'react-hook-form';
import { TextField } from '@mui/material';

export default function RHFTextField({ name, control, label, required, ...props }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...props}
          label={required ? `${label} *` : label}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || props.helperText}
          fullWidth
          value={field.value ?? ''}
        />
      )}
    />
  );
}
