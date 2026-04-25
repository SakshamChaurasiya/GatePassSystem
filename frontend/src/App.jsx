import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';
import useThemeStore from './store/useThemeStore';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import CompleteProfile from './pages/CompleteProfile';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WardenDashboard from './pages/WardenDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import GatekeeperDashboard from './pages/GatekeeperDashboard';
import StudentDashboard from './pages/StudentDashboard';
import GateScan from './pages/GateScan';

function RoleRedirect() {
  const { isAuthenticated, role } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Navigate to={`/${role}`} replace />;
}

export default function App() {
  const { initTheme, theme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Dynamic toast style based on theme
  const toastStyle = theme === 'light'
    ? { background: '#fff', color: '#1e293b', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }
    : { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '14px' };

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{ style: toastStyle }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
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

        {/* Gate Scan — QR action handler (authenticated gatekeeper only) */}
        <Route path="/gate-scan" element={<GateScan />} />

        {/* Fallback */}
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
