import { Box } from '@mui/material';

export default function ListPageLayout({ header, children }) {
  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0, mb: 2 }}>{header}</Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>{children}</Box>
    </Box>
  );
}
