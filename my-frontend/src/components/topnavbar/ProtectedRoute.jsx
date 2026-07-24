import { Navigate } from 'react-router-dom';
import { isAuthenticated, getAuthUser } from '../../utils/auth';

function ProtectedRoute({ children, allowedRoles }) {
  // Check 1 — not logged in at all
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  // Check 2 — wrong role
  if (allowedRoles && allowedRoles.length > 0) {
    const user = getAuthUser();
    const role = user?.role;

    if (!role || !allowedRoles.includes(role)) {
      // Redirect to their correct home based on role
      if (role === 'Auditor') return <Navigate to="/auditor-ul-pure" replace />;
      if (role === 'SiteOwner') return <Navigate to="/site-owner" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;