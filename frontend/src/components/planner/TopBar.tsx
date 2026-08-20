import { Search } from "lucide-react";

interface TopBarProps {
  title: string;
  contextLabel?: string;
}

export function TopBar({ title, contextLabel = "Bengaluru Urban" }: TopBarProps) {
  return (
    <header className="flex h-[64px] items-center justify-between border-b border-vo-line px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-[18px] font-semibold tracking-tight text-white">{title}</h1>
        <span className="rounded-full border border-vo-border px-3 py-1 text-[12px] text-vo-soft">{contextLabel}</span>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex h-9 w-[260px] items-center gap-2 rounded-full border border-vo-border bg-vo-surface px-3 text-[12px] text-vo-muted">
          <Search size={14} />
          <input
            className="w-full bg-transparent text-vo-text outline-none placeholder:text-vo-muted"
            placeholder="Search site, ward or feeder"
          />
        </label>
        <span className="rounded-full border border-vo-border px-3 py-1.5 text-[12px] text-vo-soft">FY 26-27</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vo-accent text-[11px] font-semibold text-[#06231b]">
          AR
        </span>
      </div>
    </header>
  );
}
