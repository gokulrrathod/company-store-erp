import { useEffect, useMemo, useState } from 'react';
import {
  AppBar, Toolbar, Typography, Box, Chip, Button, Autocomplete, TextField,
  IconButton, Badge, Menu, MenuItem, ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RuleIcon from '@mui/icons-material/Rule';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentsIcon from '@mui/icons-material/Payments';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { NAV_ITEMS } from './Sidebar.jsx';
import { api } from '../api/client.js';

const NOTIF_ICONS = {
  low_stock: WarningAmberIcon,
  inspection: RuleIcon,
  request: AssignmentIcon,
  vendor: StorefrontIcon,
  budget: AccountBalanceIcon,
  discount: LocalOfferIcon,
  sales: ReceiptLongIcon,
  dispatch: LocalShippingIcon,
  payment: PaymentsIcon,
  drawing: ArchitectureIcon,
  production: PrecisionManufacturingIcon,
  project: EngineeringIcon,
  vehicle: DirectionsCarIcon,
};

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const searchOptions = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)),
    [user]
  );

  useEffect(() => {
    api.get('/notifications')
      .then(({ data }) => setNotifications(data.map((n) => ({ ...n, icon: NOTIF_ICONS[n.icon] || NotificationsIcon }))))
      .catch(() => setNotifications([]));
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar sx={{ gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
            color: 'white',
          }}
        >
          <Inventory2Icon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            VMG Industries
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ERP Demo
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Autocomplete
          size="small"
          options={searchOptions}
          getOptionLabel={(opt) => opt.label}
          onChange={(e, value) => value && navigate(value.path)}
          sx={{ width: 260 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search menu"
              placeholder="e.g. Vendors, Drawings…"
              InputProps={{
                ...params.InputProps,
                startAdornment: <SearchIcon fontSize="small" sx={{ color: 'text.disabled', ml: 0.5, mr: 0.5 }} />,
              }}
            />
          )}
        />

        <IconButton color="inherit" onClick={(e) => setNotifAnchor(e.currentTarget)}>
          <Badge badgeContent={notifications.length} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <Menu anchorEl={notifAnchor} open={!!notifAnchor} onClose={() => setNotifAnchor(null)} PaperProps={{ sx: { width: 320 } }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 700 }}>Notifications</Typography>
          <Divider />
          {!notifications.length && (
            <MenuItem disabled>
              <ListItemText primary="You're all caught up" />
            </MenuItem>
          )}
          {notifications.map((n, idx) => {
            const Icon = n.icon;
            return (
              <MenuItem key={idx} onClick={() => { setNotifAnchor(null); navigate(n.path); }}>
                <ListItemIcon><Icon fontSize="small" color="primary" /></ListItemIcon>
                <ListItemText primary={n.text} primaryTypographyProps={{ fontSize: '0.85rem' }} />
              </MenuItem>
            );
          })}
        </Menu>

        <Chip size="small" label={`${user?.name} · ${user?.role}`} sx={{ bgcolor: '#EEF2FF', color: 'primary.dark' }} />
        <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}
