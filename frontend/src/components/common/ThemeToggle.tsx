import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../hooks/useTheme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={
        compact
          ? "flex h-9 w-9 items-center justify-center rounded-xl border border-vo-line bg-vo-card text-vo-soft hover:text-vo-text"
          : "flex items-center gap-1.5 rounded-xl border border-vo-line bg-vo-card px-2.5 py-1.5 text-[11px] font-medium text-vo-soft hover:text-vo-text"
      }
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      {compact ? null : <span>{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}
