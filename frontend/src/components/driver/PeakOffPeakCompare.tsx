import { formatInr } from "../../utils/format";

interface PeakOffPeakCompareProps {
  peakTariff: number;
  offPeakTariff: number;
  peakTotal: number | null;
  offPeakTotal: number | null;
  savingsTotal: number | null;
  savingsPct: number | null;
  cheaper: "peak" | "off-peak" | "same";
  tone?: "light" | "dark";
}

export function PeakOffPeakCompare({
  peakTariff,
  offPeakTariff,
  peakTotal,
  offPeakTotal,
  savingsTotal,
  savingsPct,
  cheaper,
  tone = "light",
}: PeakOffPeakCompareProps) {
  const dark = tone === "dark";
  const card = dark
    ? "rounded-2xl border border-vo-line bg-vo-card/80 p-4"
    : "rounded-[18px] border border-driver-line bg-white p-4";
  const muted = dark ? "text-vo-muted" : "text-driver-muted";
  const ink = dark ? "text-white" : "text-driver-ink";
  const recommended = cheaper === "off-peak" ? "Off-Peak" : cheaper === "peak" ? "Peak" : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className={`${card} ${cheaper === "peak" ? "ring-1 ring-vo-accent/40" : ""}`}>
          <p className={`text-[10px] font-semibold tracking-[0.16em] uppercase ${muted}`}>Peak</p>
          <p className={`mt-2 text-[18px] font-semibold ${ink}`}>{formatInr(peakTariff)}/kWh</p>
          <p className={`mt-1 text-[12px] ${muted}`}>
            {peakTotal == null ? "Add a vehicle for a session total" : formatInr(peakTotal)}
          </p>
        </div>
        <div className={`${card} ${cheaper === "off-peak" ? "ring-1 ring-vo-accent/40" : ""}`}>
          <p className={`text-[10px] font-semibold tracking-[0.16em] uppercase ${muted}`}>Off-Peak</p>
          <p className={`mt-2 text-[18px] font-semibold ${ink}`}>{formatInr(offPeakTariff)}/kWh</p>
          <p className={`mt-1 text-[12px] ${muted}`}>
            {offPeakTotal == null ? "Add a vehicle for a session total" : formatInr(offPeakTotal)}
          </p>
        </div>
      </div>
      {savingsTotal != null && savingsTotal > 0 && savingsPct != null && recommended ? (
        <div className={dark ? "rounded-2xl bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-300" : "rounded-[18px] bg-driver-mint px-4 py-3 text-[13px] text-[#0b7a52]"}>
          <p className="font-semibold">Recommended · {recommended}</p>
          <p className="mt-0.5">
            Save {formatInr(savingsTotal)} ({savingsPct}%) compared with {cheaper === "off-peak" ? "Peak" : "Off-Peak"}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
