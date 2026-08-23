import { createTheme } from '@mui/material/styles';

export const SIDEBAR_BG = '#0F172A';
export const SIDEBAR_BG_HOVER = 'rgba(255,255,255,0.06)';

export const vmgTheme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5',
      light: '#6366F1',
      dark: '#4338CA',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F8FAFC',
      paper: '#ffffff',
    },
    success: { main: '#059669' },
    warning: { main: '#D97706' },
    error: { main: '#E11D48' },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
    },
    divider: '#E2E8F0',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: [
      '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
      '"Helvetica Neue"', 'Arial', 'sans-serif',
    ].join(','),
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  components: {
    // The app shell (NavShell) owns scrolling internally via its own overflow:auto content
    // pane — html/body must never scroll themselves, or a stray tall/portal-rendered element
    // can make the browser show its own outer scrollbar alongside the app's, which looks broken
    // and scrolls the sidebar/content out of sync with each other.
    MuiCssBaseline: {
      styleOverrides: {
        'html, body': { height: '100%', overflow: 'hidden', margin: 0 },
        '#root': { height: '100%' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1E293B',
          borderBottom: '1px solid #E2E8F0',
        },
      },
    },
    MuiButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiFormControl: {
      defaultProps: { size: 'small' },
    },
    MuiSelect: {
      defaultProps: { size: 'small' },
    },
    MuiAutocomplete: {
      defaultProps: { size: 'small' },
    },
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { fontWeight: 700 },
      },
    },
    MuiIconButton: {
      defaultProps: { size: 'small' },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderColor: '#E2E8F0' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.4 },
      },
    },
  },
});
