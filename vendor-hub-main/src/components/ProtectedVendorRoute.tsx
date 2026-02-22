import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useVendorAuth } from "@/hooks/useVendorAuth";

export function ProtectedVendorRoute() {
  const { token, ready } = useVendorAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
