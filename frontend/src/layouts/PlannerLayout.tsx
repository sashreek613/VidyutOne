import { Outlet } from "react-router-dom";

import { Sidebar } from "../components/planner/Sidebar";

export function PlannerLayout() {
  return (
    <div className="flex min-h-screen bg-vo-bg text-vo-text">
      <Sidebar />
      <div className="vo-scroll min-h-screen flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
