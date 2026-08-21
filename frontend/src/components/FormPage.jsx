import { Box, Paper, Typography, IconButton, Alert, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

export default function FormPage({ title, subtitle, backTo, formError, children, actions }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <IconButton size="small" onClick={() => (backTo ? navigate(backTo) : navigate(-1))}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>{title}</Typography>
      </Stack>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ ml: 5, mb: 2 }}>
          {subtitle}
        </Typography>
      )}

      <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
        {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
        <Stack spacing={2.5}>{children}</Stack>
      </Paper>

      {actions && (
        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 2 }}>
          {actions}
        </Stack>
      )}
    </Box>
  );
}
