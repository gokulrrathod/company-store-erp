import { Box, Typography } from '@mui/material';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 1.5,
        px: 3,
        bgcolor: 'primary.dark',
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
      }}
    >
      <Typography variant="caption">
        © {new Date().getFullYear()} VMG Industries — Store Department
      </Typography>
    </Box>
  );
}
