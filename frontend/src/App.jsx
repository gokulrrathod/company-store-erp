import { Routes, Route } from 'react-router-dom';
import NavShell from './components/NavShell.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import StockMovementsPage from './pages/StockMovementsPage.jsx';
import MaterialRequestsPage from './pages/MaterialRequestsPage.jsx';
import LowStockPage from './pages/LowStockPage.jsx';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage.jsx';
import PurchaseOrderFormPage from './pages/PurchaseOrderFormPage.jsx';
import GoodsReceiptPage from './pages/GoodsReceiptPage.jsx';
import MaterialReceiptFormPage from './pages/MaterialReceiptFormPage.jsx';
import MaterialReceiptDetailPage from './pages/MaterialReceiptDetailPage.jsx';
import RejectedMaterialPage from './pages/RejectedMaterialPage.jsx';
import RejectedMaterialFormPage from './pages/RejectedMaterialFormPage.jsx';
import HousekeepingPage from './pages/HousekeepingPage.jsx';
import SafetyPage from './pages/SafetyPage.jsx';
import StoragePage from './pages/StoragePage.jsx';
import ItemFormPage from './pages/ItemFormPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import EnquiriesPage from './pages/EnquiriesPage.jsx';
import EnquiryDetailPage from './pages/EnquiryDetailPage.jsx';
import SalesOrdersPage from './pages/SalesOrdersPage.jsx';
import SalesOrderDetailPage from './pages/SalesOrderDetailPage.jsx';
import VendorsPage from './pages/VendorsPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import DrawingsPage from './pages/DrawingsPage.jsx';
import DrawingFormPage from './pages/DrawingFormPage.jsx';
import DrawingDetailPage from './pages/DrawingDetailPage.jsx';
import ProductionPlansPage from './pages/ProductionPlansPage.jsx';
import ProductionPlanDetailPage from './pages/ProductionPlanDetailPage.jsx';
import ScheduleDetailPage from './pages/ScheduleDetailPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import VehiclesPage from './pages/VehiclesPage.jsx';
import VehicleDetailPage from './pages/VehicleDetailPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx';
import InvoiceDetailPage from './pages/InvoiceDetailPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <NavShell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/storage" element={<StoragePage />} />
                <Route path="/storage/new" element={<ItemFormPage />} />
                <Route path="/storage/:id/edit" element={<ItemFormPage />} />
                <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
                <Route path="/goods-receipt" element={<GoodsReceiptPage />} />
                <Route path="/goods-receipt/new" element={<MaterialReceiptFormPage />} />
                <Route path="/goods-receipt/:id" element={<MaterialReceiptDetailPage />} />
                <Route path="/stock-movements" element={<StockMovementsPage />} />
                <Route path="/material-requests" element={<MaterialRequestsPage />} />
                <Route path="/low-stock" element={<LowStockPage />} />
                <Route path="/rejected-material" element={<RejectedMaterialPage />} />
                <Route path="/rejected-material/new" element={<RejectedMaterialFormPage />} />
                <Route path="/housekeeping" element={<HousekeepingPage />} />
                <Route path="/safety" element={<SafetyPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/enquiries" element={<EnquiriesPage />} />
                <Route path="/enquiries/:id" element={<EnquiryDetailPage />} />
                <Route path="/sales-orders" element={<SalesOrdersPage />} />
                <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/budgets" element={<BudgetsPage />} />
                <Route path="/drawings" element={<DrawingsPage />} />
                <Route path="/drawings/new" element={<DrawingFormPage />} />
                <Route path="/drawings/:id" element={<DrawingDetailPage />} />
                <Route path="/production-plans" element={<ProductionPlansPage />} />
                <Route path="/production-plans/:id" element={<ProductionPlanDetailPage />} />
                <Route path="/production-schedules/:id" element={<ScheduleDetailPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/vehicles" element={<VehiclesPage />} />
                <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              </Routes>
            </NavShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
