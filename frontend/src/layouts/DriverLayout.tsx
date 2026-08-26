import { Outlet } from "react-router-dom";

export function DriverLayout() {
  return (
    <div className="flex min-h-screen justify-center bg-vo-bg">
      <div className="relative w-full max-w-[430px] min-h-screen overflow-hidden bg-driver-bg text-driver-ink shadow-[0_0_80px_rgba(0,0,0,0.45)]">
        <Outlet />
      </div>
    </div>
  );
}
