import { Box, Typography } from '@mui/material';

const RING_GRADIENT = 'conic-gradient(from 0deg, #4F46E5, #0EA5E9, #10B981, #F59E0B, #E11D48, #7C3AED, #4F46E5)';

export function Spinner({ size = 42 }) {
  return (
    <Box
      sx={{
        width: size, height: size, borderRadius: '50%', padding: '4px',
        background: RING_GRADIENT,
        animation: 'vmg-spin 1.1s linear infinite',
        '@keyframes vmg-spin': { to: { transform: 'rotate(360deg)' } },
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
      }}
    />
  );
}

export default function LoadingState({ label = 'Loading...' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 8 }}>
      <Spinner />
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Box>
  );
}
