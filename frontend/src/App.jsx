import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/AuthPage';
import ErrorBoundary from './components/ui/ErrorBoundary';
import OfflineBanner from './components/ui/OfflineBanner';
import Unauthorized from './pages/Unauthorized';
import POSPage from './pages/POSPage';
import KitchenPage from './pages/KitchenPage';
import PickupDisplayPage from './pages/PickupDisplayPage';
import StudentPortalLayout from './components/student/StudentPortalLayout';
import StudentMenu from './pages/student/StudentMenu';
import StudentWallet from './pages/student/StudentWallet';
import StudentHistory from './pages/student/StudentHistory';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import MenuManagement from './pages/admin/MenuManagement';
import InventoryManagement from './pages/admin/InventoryManagement';
import OrdersManagement from './pages/admin/OrdersManagement';
import ReportsAnalytics from './pages/admin/ReportsAnalytics';
import StaffManagement from './pages/admin/StaffManagement';
import MealPlanManagement from './pages/admin/MealPlanManagement';
import AdminSettings from './components/admin/pages/Settings';
import BarcodeManagement from './components/admin/pages/BarcodeManagement';
import { getRoleRedirectPath } from './utils/storage';

function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-forest/20 border-t-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleRedirectPath(user.role)} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <OfflineBanner />
        <div className="flex-1">
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/display" element={<PickupDisplayPage />} />

          <Route
            path="/pos"
            element={
              <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                <POSPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/kitchen"
            element={
              <ProtectedRoute allowedRoles={['kitchen', 'admin']}>
                <KitchenPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentPortalLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/student/menu" replace />} />
            <Route path="menu" element={<StudentMenu />} />
            <Route path="wallet" element={<StudentWallet />} />
            <Route path="history" element={<StudentHistory />} />
          </Route>

          <Route path="/menu" element={<Navigate to="/student/menu" replace />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="orders" element={<OrdersManagement />} />
            <Route path="reports" element={<ReportsAnalytics />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="meal-plans" element={<MealPlanManagement />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="barcode-management" element={<BarcodeManagement />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
    </ErrorBoundary>
  );
}
