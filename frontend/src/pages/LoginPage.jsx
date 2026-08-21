import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Paper, Button, Typography, Alert, Stack } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { SIDEBAR_BG } from '../theme/vmgTheme.js';
import RHFTextField from '../components/form/RHFTextField.jsx';
import { loginSchema } from '../validation/schemas.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const {
    control, handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setError('');
    try {
      await login(values.email, values.password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: SIDEBAR_BG }}>
      <Paper sx={{ p: 4, width: 380, borderRadius: 3 }} elevation={6}>
        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
              color: 'white',
            }}
          >
            <Inventory2Icon />
          </Box>
          <Typography variant="h6" fontWeight={700}>Store Dept — VMG Industries</Typography>
        </Stack>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <RHFTextField name="email" control={control} label="Email" type="email" autoFocus required />
            <RHFTextField name="password" control={control} label="Password" type="password" required />
            <Button type="submit" variant="contained" color="primary" size="large" disabled={isSubmitting}>Sign In</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
