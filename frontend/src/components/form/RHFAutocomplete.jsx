import { Controller } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';

// Drop-in replacement for RHFSelect when the option list can get long (items,
// suppliers, purchase orders, ...) — lets the user type to filter instead of
// scrolling a giant menu.
export default function RHFAutocomplete({ name, control, label, required, options, getLabel, getValue, onValueChange, sx, ...props }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selected = options.find((opt) => String(getValue(opt)) === String(field.value)) ?? null;
        return (
          <Autocomplete
            options={options}
            getOptionLabel={(opt) => getLabel(opt)}
            isOptionEqualToValue={(opt, val) => String(getValue(opt)) === String(getValue(val))}
            value={selected}
            onChange={(_, newValue) => {
              const v = newValue ? getValue(newValue) : '';
              field.onChange(v);
              onValueChange?.(v, newValue);
            }}
            onBlur={field.onBlur}
            fullWidth
            sx={sx}
            renderInput={(params) => (
              <TextField
                {...params}
                label={required ? `${label} *` : label}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
            {...props}
          />
        );
      }}
    />
  );
}
