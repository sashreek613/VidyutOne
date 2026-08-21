import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { AuthLoadingScreen } from "./AuthLoadingScreen";
import { homeForRole } from "../../lib/authRoutes";
import { useAuth } from "../../hooks/useAuth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, session, emailVerified, profile, configured, signOut } = useAuth();
  const location = useLocation();

  if (!configured) {
    return <Navigate to="/" replace />;
  }
  if (loading) {
    return <AuthLoadingScreen />;
  }
  if (!session || !session.user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-vo-bg px-6 text-center text-vo-text">
        <p className="text-[15px] text-vo-soft">Could not load your profile. Is the API running at VITE_API_BASE_URL?</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 text-[13px] text-vo-accent"
        >
          Logout
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

export function RoleProtectedRoute({
  role,
  children,
}: {
  role: "planner" | "driver";
  children: ReactNode;
}) {
  const { loading, profile } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }
  if (profile && profile.role !== role) {
    return <Navigate to="/forbidden" replace />;
  }
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { loading, session, emailVerified, profile } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }
  if (session && emailVerified && profile) {
    return <Navigate to={homeForRole(profile.role)} replace />;
  }
  return <>{children}</>;
}
