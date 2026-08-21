import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { Alert } from '@mui/material';

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Alert severity="error">You don't have permission to view this page.</Alert>;
  }
  return children;
}
