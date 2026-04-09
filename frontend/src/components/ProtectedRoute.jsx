import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, mustChangePassword } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user must change password, redirect to change-password page
  if (mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Check role access
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={`/${role}`} replace />;
  }

  return children;
}
