import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import CompleteProfile from './pages/CompleteProfile';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WardenDashboard from './pages/WardenDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import GatekeeperDashboard from './pages/GatekeeperDashboard';
import StudentDashboard from './pages/StudentDashboard';

function RoleRedirect() {
  const { isAuthenticated, role } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={`/${role}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Auth Required — Password Change */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* Auth Required — Profile Completion */}
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />

        {/* Role-specific Dashboards */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={['super-admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden"
          element={
            <ProtectedRoute allowedRoles={['warden']}>
              <WardenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={['manager']}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gatekeeper"
          element={
            <ProtectedRoute allowedRoles={['gatekeeper']}>
              <GatekeeperDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
