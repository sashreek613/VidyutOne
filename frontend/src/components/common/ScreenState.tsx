import type { ReactNode } from "react";

interface ScreenStateProps {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyMessage?: string;
  tone?: "dark" | "light";
  children: ReactNode;
}

export function ScreenState({
  loading,
  error,
  empty = false,
  emptyMessage = "Nothing to show yet.",
  tone = "dark",
  children,
}: ScreenStateProps) {
  const muted = tone === "dark" ? "text-vo-muted" : "text-driver-muted";

  if (loading) {
    return <p className={`px-6 py-10 text-sm ${muted}`}>Loading…</p>;
  }
  if (error) {
    return (
      <p className="px-6 py-10 text-sm text-vo-red">
        Could not load data. {error}
      </p>
    );
  }
  if (empty) {
    return <p className={`px-6 py-10 text-sm ${muted}`}>{emptyMessage}</p>;
  }
  return <>{children}</>;
}
