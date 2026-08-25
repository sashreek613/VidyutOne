import { Navigation } from "lucide-react";
import { Link } from "react-router-dom";

import type { Charger } from "../../types";
import { formatInr, formatKm } from "../../utils/format";

interface ChargerCardProps {
  charger: Charger;
  km: number;
  freeCount: number;
  totalCount: number;
  /** Position within the composite-sorted "Recommended for you" list (see
   * sortByRecommendation in DriverHomePage.tsx) -- display only, omit for
   * the full/unranked list. */
  rank?: number;
  /** Driver's current origin, used to build the "Navigate" Google Maps URL. */
  origin?: { latitude: number; longitude: number };
}

export function ChargerCard({ charger, km, freeCount, totalCount, rank, origin }: ChargerCardProps) {
  const isReal = charger.provenance === "REAL";
  const tight = freeCount <= 1;

  function handleNavigate(e: React.MouseEvent) {
    // Prevent the parent <Link> from navigating to charger details
    e.preventDefault();
    e.stopPropagation();
    const from = origin ? `${origin.latitude},${origin.longitude}&` : "";
    const url = `https://www.google.com/maps/dir/?api=1&${from ? `origin=${from}` : ""}destination=${charger.latitude},${charger.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Link
      to={`/driver/charger/${charger.id}`}
      className="block rounded-[22px] border border-driver-line bg-white px-4 py-4 shadow-[0_8px_24px_rgba(16,24,20,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            {rank !== undefined ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-driver-ink text-[9px] font-bold text-white">
                {rank}
              </span>
            ) : null}
            <p className="text-[16px] font-semibold text-driver-ink">{charger.name.replace(" (demo)", "")}</p>
            {isReal ? (
              <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#4338ca]">
                OpenChargeMap
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] text-driver-muted">
            {charger.connector_type}
            {isReal ? (
              // OCM's status is infrastructure-operational, not live per-plug
              // occupancy -- never phrase it like the demo "Live/Offline".
              <> · {charger.availability === null ? "Status unknown" : charger.availability ? "Operational" : "Reported down"}</>
            ) : (
              <> · {charger.availability ? "Live" : "Offline"}</>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isReal ? (
            <span className="inline-flex rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-[#4338ca]">
              INFO ONLY
            </span>
          ) : (
            <>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${
                  tight ? "bg-[#fff4d9] text-[#b78100]" : "bg-driver-mint text-[#0b7a52]"
                }`}
              >
                {freeCount} OF {totalCount} FREE
              </span>
              <p className={`text-[12px] ${charger.availability ? "text-[#0b7a52]" : "text-[#b78100]"}`}>
                {charger.availability ? "No wait" : "In use"}
              </p>
            </>
          )}
          {/* Navigate button – always visible */}
          <button
            type="button"
            onClick={handleNavigate}
            className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
          >
            <Navigation size={10} />
            Navigate
          </button>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-driver-muted">
        {formatKm(km)}
        <span className="mx-2 text-driver-line">|</span>
        {charger.power_kw !== null ? `${charger.power_kw} kW` : "Power unknown"}
        <span className="mx-2 text-driver-line">|</span>
        {charger.price_per_kwh !== null ? formatInr(charger.price_per_kwh) : "Price unknown"}
      </p>
    </Link>
  );
}
