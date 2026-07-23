import { Navigate } from 'react-router-dom';
import { isAuthenticated, getAuthUser } from '../../utils/auth';

function ProtectedRoute({ children, allowedRoles }) {
  // Not logged in at all → back to home
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  // Role check — only if allowedRoles was specified
  if (allowedRoles && allowedRoles.length > 0) {
    const user = getAuthUser();
    const userRole = user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      // Logged in but wrong role → redirect to their correct home
      if (userRole === 'Auditor') {
        return <Navigate to="/auditor-ul-pure" replace />;
      }
      if (userRole === 'SiteOwner') {
        return <Navigate to="/site-owner" replace />;
      }
      // Unknown role → back to home
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;