import { MD3LightTheme } from 'react-native-paper';

// Same palette as the web app's vmgTheme.js — one brand identity across platforms.
export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4F46E5',
    secondary: '#0EA5E9',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    error: '#E11D48',
    onPrimary: '#FFFFFF',
  },
};

export const statusColors = {
  PENDING: '#D97706', PENDING_INSPECTION: '#D97706', PENDING_VERIFICATION: '#D97706',
  APPROVED: '#059669', ACCEPTED: '#059669', ACTIVE: '#059669', CLOSED: '#059669', OPEN: '#64748B',
  REJECTED: '#E11D48', PARTIALLY_ACCEPTED: '#D97706', INSPECTED: '#64748B',
  FORWARDED_TO_PURCHASE: '#0EA5E9', PO_RAISED: '#7C3AED', PARTIALLY_RECEIVED: '#D97706', AMENDED: '#E11D48',
};

export function statusColor(status) {
  return statusColors[status] || '#64748B';
}
