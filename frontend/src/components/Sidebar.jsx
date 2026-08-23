import { useEffect, useState } from 'react';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Tooltip, IconButton, Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import EngineeringIcon from '@mui/icons-material/Engineering';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PaymentsIcon from '@mui/icons-material/Payments';
import HistoryIcon from '@mui/icons-material/History';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { SIDEBAR_BG, SIDEBAR_BG_HOVER } from '../theme/vmgTheme.js';

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 72;

// Grouped by department so the menu reads top-to-bottom the same way the SOPs
// are organized, instead of one flat alphabet-soup list.
export const NAV_GROUPS = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: DashboardIcon, roles: null },
    ],
  },
  {
    section: 'Sales',
    items: [
      { label: 'Enquiries', path: '/enquiries', icon: RequestQuoteIcon, roles: null },
      { label: 'Sales Orders', path: '/sales-orders', icon: ReceiptLongIcon, roles: null },
    ],
  },
  {
    section: 'Store',
    items: [
      { label: 'Inventory', path: '/inventory', icon: InventoryIcon, roles: null },
      { label: 'Storage & Master Data', path: '/storage', icon: WarehouseIcon, roles: null },
      { label: 'Goods Receipt', path: '/goods-receipt', icon: LocalShippingIcon, roles: ['STORE_EXECUTIVE', 'STORE_MANAGER', 'QUALITY', 'ADMIN'] },
      { label: 'Stock Movements', path: '/stock-movements', icon: SwapVertIcon, roles: null },
      { label: 'Material Requests', path: '/material-requests', icon: AssignmentIcon, roles: null },
      { label: 'Low Stock Alerts', path: '/low-stock', icon: WarningAmberIcon, roles: null },
      { label: 'Rejected Material', path: '/rejected-material', icon: ReportProblemIcon, roles: null },
      { label: 'Housekeeping', path: '/housekeeping', icon: CleaningServicesIcon, roles: null },
      { label: 'Safety & Compliance', path: '/safety', icon: HealthAndSafetyIcon, roles: null },
    ],
  },
  {
    section: 'Purchase',
    items: [
      { label: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCartIcon, roles: ['PURCHASE', 'STORE_MANAGER', 'FINANCE', 'ADMIN'] },
      { label: 'Vendors', path: '/vendors', icon: StorefrontIcon, roles: ['PURCHASE', 'FINANCE', 'MANAGEMENT', 'ADMIN'] },
      { label: 'Budgets', path: '/budgets', icon: AccountBalanceIcon, roles: ['FINANCE', 'PURCHASE', 'MANAGEMENT', 'ADMIN'] },
    ],
  },
  {
    section: 'Design',
    items: [
      { label: 'Drawings', path: '/drawings', icon: ArchitectureIcon, roles: null },
    ],
  },
  {
    section: 'Production',
    items: [
      { label: 'Production Plans', path: '/production-plans', icon: PrecisionManufacturingIcon, roles: null },
      { label: 'Resource Allocation', path: '/resource-allocation', icon: EngineeringIcon, roles: null },
    ],
  },
  {
    section: 'Project / Civil',
    items: [
      { label: 'Projects', path: '/projects', icon: EngineeringIcon, roles: null },
    ],
  },
  {
    section: 'Transport',
    items: [
      { label: 'Vehicles', path: '/vehicles', icon: LocalShippingOutlinedIcon, roles: null },
    ],
  },
  {
    section: 'Accounts',
    items: [
      { label: 'Invoices & Payments', path: '/invoices', icon: PaymentsIcon, roles: ['ACCOUNTS', 'FINANCE', 'MANAGEMENT', 'ADMIN'] },
      { label: 'Document Archive', path: '/document-archive', icon: HistoryIcon, roles: ['ACCOUNTS', 'MANAGEMENT', 'ADMIN'] },
    ],
  },
  {
    section: 'Reports',
    items: [
      { label: 'Reports', path: '/reports', icon: AssessmentIcon, roles: null },
    ],
  },
  {
    section: 'Admin',
    items: [
      { label: 'Audit Trail', path: '/audit-log', icon: HistoryIcon, roles: ['ADMIN'] },
    ],
  },
];

// Flat list for the header search box.
export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const STORAGE_KEY = 'vmg-sidebar-collapsed';

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);
  return [collapsed, setCollapsed];
}

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { user } = useAuth();

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <Box
      component="nav"
      sx={{
        width,
        flexShrink: 0,
        bgcolor: SIDEBAR_BG,
        color: '#CBD5E1',
        height: '100%',
        transition: 'width 0.2s ease',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', px: 1, py: 1 }}>
        <IconButton size="small" onClick={onToggle} sx={{ color: '#94A3B8', '&:hover': { color: '#fff' } }}>
          {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      <Box
        sx={{
          overflowY: 'auto',
          flexGrow: 1,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.25) transparent',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3 },
          '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        }}
      >
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => !item.roles || item.roles.includes(user?.role));
          if (!visibleItems.length) return null;
          return (
            <List
              key={group.section}
              dense
              sx={{ py: 0.5, px: 1 }}
              subheader={
                !collapsed && (
                  <ListSubheader
                    component="div"
                    sx={{ bgcolor: 'transparent', color: '#64748B', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 0.6, lineHeight: 2.2 }}
                  >
                    {group.section.toUpperCase()}
                  </ListSubheader>
                )
              }
            >
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                const button = (
                  <ListItemButton
                    key={item.path}
                    component={Link}
                    to={item.path}
                    sx={{
                      mb: 0.5,
                      borderRadius: 2,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      px: collapsed ? 1 : 2,
                      color: active ? '#ffffff' : '#94A3B8',
                      bgcolor: active ? 'primary.main' : 'transparent',
                      boxShadow: active ? '0 2px 8px rgba(79,70,229,0.35)' : 'none',
                      '&:hover': { bgcolor: active ? 'primary.main' : SIDEBAR_BG_HOVER, color: '#ffffff' },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 'auto' : 36, justifyContent: 'center' }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
                    )}
                  </ListItemButton>
                );
                return collapsed ? (
                  <Tooltip key={item.path} title={item.label} placement="right">
                    {button}
                  </Tooltip>
                ) : button;
              })}
            </List>
          );
        })}
      </Box>
    </Box>
  );
}
