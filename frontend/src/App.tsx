import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { GuestRoute, ProtectedRoute, RoleProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthProvider";
import { DriverLayout } from "./layouts/DriverLayout";
import { PlannerLayout } from "./layouts/PlannerLayout";
import { AuthCallbackPage } from "./pages/auth/AuthCallbackPage";
import { ForbiddenPage } from "./pages/auth/ForbiddenPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { BookingPage } from "./pages/driver/BookingPage";
import { ChargerDetailsPage } from "./pages/driver/ChargerDetailsPage";
import { ChargingWindowPage } from "./pages/driver/ChargingWindowPage";
import { DriverHomePage } from "./pages/driver/DriverHomePage";
import { PlannerDashboardPage } from "./pages/planner/PlannerDashboardPage";
import { PlannerSiteDetailsPage } from "./pages/planner/PlannerSiteDetailsPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <SignupPage />
              </GuestRoute>
            }
          />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/forbidden"
            element={
              <ProtectedRoute>
                <ForbiddenPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner"
            element={
              <RoleProtectedRoute role="planner">
                <PlannerLayout />
              </RoleProtectedRoute>
            }
          >
            <Route index element={<PlannerDashboardPage />} />
            <Route path="site/:siteId" element={<PlannerSiteDetailsPage />} />
          </Route>
          <Route
            path="/driver"
            element={
              <RoleProtectedRoute role="driver">
                <DriverLayout />
              </RoleProtectedRoute>
            }
          >
            <Route index element={<DriverHomePage />} />
            <Route path="charger/:chargerId" element={<ChargerDetailsPage />} />
            <Route path="charger/:chargerId/book" element={<ChargingWindowPage />} />
            <Route path="booking/:bookingId" element={<BookingPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
