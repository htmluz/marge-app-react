import { Navigate, Outlet } from "react-router";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();

  // TODO: test and change
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
}
