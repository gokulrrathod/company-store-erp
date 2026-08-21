import { Controller } from 'react-hook-form';
import { TextField, MenuItem } from '@mui/material';

export default function RHFSelect({ name, control, label, required, options, getLabel, getValue, ...props }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...props}
          select
          label={required ? `${label} *` : label}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || props.helperText}
          fullWidth
          value={field.value ?? ''}
        >
          {options.map((opt) => (
            <MenuItem key={getValue(opt)} value={getValue(opt)}>
              {getLabel(opt)}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
