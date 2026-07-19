import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleRedirectPath } from '../utils/storage';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-forest/20 border-t-accent" />
          <p className="text-lg font-medium text-forest">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectPath = getRoleRedirectPath(user.role);
    if (location.pathname !== redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
