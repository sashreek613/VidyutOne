import { NavLink } from "react-router-dom";
import { Activity, ClipboardList, FileText, LayoutGrid, Map, Zap } from "lucide-react";

import { BrandMark } from "../common/BrandMark";

const items = [
  { to: "/planner", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/planner", label: "Site Explorer", icon: Map, end: false, hash: "#map" },
  { to: "/planner", label: "Grid & Demand", icon: Activity, end: false, hash: "#grid" },
  { to: "/planner", label: "Build Plan", icon: ClipboardList, end: false },
  { to: "/planner", label: "Reports", icon: FileText, end: false },
];

export function Sidebar() {
  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-vo-line bg-[#0c1014] px-5 py-6">
      <div className="mb-8 flex items-center gap-2.5">
        <BrandMark />
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-white">VidyutOne</p>
          <p className="text-[10px] tracking-[0.18em] text-vo-muted">PHASE 1 MVP</p>
        </div>
      </div>
      <p className="mb-3 text-[10px] font-medium tracking-[0.2em] text-vo-muted">PLANNER CONSOLE</p>
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.hash ? `${item.to}${item.hash}` : item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition ${
                isActive && item.label === "Overview"
                  ? "bg-vo-accent-dim text-vo-accent"
                  : "text-vo-soft hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon size={15} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-2 pt-8 text-[11px] text-vo-muted">
        <Zap size={12} className="text-vo-accent" />
        Sample · Bengaluru Urban
      </div>
    </aside>
  );
}
