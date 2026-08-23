import { useAuth } from '../auth/AuthContext.jsx';
import StoreDashboard from './dashboard/StoreDashboard.jsx';
import PurchaseDashboard from './dashboard/PurchaseDashboard.jsx';
import SalesDashboard from './dashboard/SalesDashboard.jsx';

// Each role sees the dashboard relevant to its own job. Unmapped roles
// (Store, Quality, Production, Design, Project, Transport, Admin,
// Management, ...) fall back to the Store overview — today's default —
// until their own dashboards are built out.
const ROLE_DASHBOARDS = {
  PURCHASE: PurchaseDashboard,
  SALES: SalesDashboard,
  DISPATCH: SalesDashboard,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const Dashboard = ROLE_DASHBOARDS[user?.role] || StoreDashboard;
  return <Dashboard />;
}
