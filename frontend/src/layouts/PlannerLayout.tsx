import { Outlet } from "react-router-dom";

import { Sidebar } from "../components/planner/Sidebar";

export function PlannerLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-vo-bg text-vo-text">
      <Sidebar />
      <div className="vo-scroll min-h-0 flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
