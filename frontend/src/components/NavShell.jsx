import { Box } from '@mui/material';
import Header from './Header.jsx';
import Sidebar, { useSidebarCollapsed } from './Sidebar.jsx';
import Footer from './Footer.jsx';

export default function NavShell({ children }) {
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto', bgcolor: 'background.default', px: 3, py: 3 }}>
          {children}
        </Box>
      </Box>
      <Footer />
    </Box>
  );
}
