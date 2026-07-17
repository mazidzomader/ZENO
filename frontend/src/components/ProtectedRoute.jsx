import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap any route element with this to require login, and optionally a role.
// Usage: <ProtectedRoute roles={["owner", "admin"]}><SlotForm /></ProtectedRoute>
function ProtectedRoute({ children, roles }) {
  const { user, token, loadingUser } = useAuth();

  if (loadingUser) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center font-mono text-sm uppercase text-inkMuted">
        [LOADING_SESSION...]
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center font-mono text-sm uppercase text-alert">
        [ERR] Access denied for role: {user.role}
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;