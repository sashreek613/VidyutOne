import { Outlet } from "react-router-dom";

export function DriverLayout() {
  return (
    <div className="flex min-h-screen justify-center bg-[var(--vo-bg)] transition-colors">
      <div className="relative w-full max-w-[430px] min-h-screen overflow-hidden bg-[var(--driver-bg)] text-[var(--driver-ink)] border-x border-[var(--vo-border)] shadow-xs transition-colors flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
