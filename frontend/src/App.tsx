import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { DriverLayout } from "./layouts/DriverLayout";
import { PlannerLayout } from "./layouts/PlannerLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { BookingPage } from "./pages/driver/BookingPage";
import { ChargerDetailsPage } from "./pages/driver/ChargerDetailsPage";
import { ChargingWindowPage } from "./pages/driver/ChargingWindowPage";
import { DriverHomePage } from "./pages/driver/DriverHomePage";
import { PlannerDashboardPage } from "./pages/planner/PlannerDashboardPage";
import { PlannerSiteDetailsPage } from "./pages/planner/PlannerSiteDetailsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/planner" element={<PlannerLayout />}>
          <Route index element={<PlannerDashboardPage />} />
          <Route path="site/:siteId" element={<PlannerSiteDetailsPage />} />
        </Route>
        <Route path="/driver" element={<DriverLayout />}>
          <Route index element={<DriverHomePage />} />
          <Route path="charger/:chargerId" element={<ChargerDetailsPage />} />
          <Route path="charger/:chargerId/book" element={<ChargingWindowPage />} />
          <Route path="booking/:bookingId" element={<BookingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
