import { Calendar, Navigation } from "lucide-react";
import { Link } from "react-router-dom";

import type { Charger } from "../../types";
import { isChargerBookable } from "../../utils/chargerFilters";
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
  selected?: boolean;
  onSelect?: (chargerId: string) => void;
}

function availabilityCopy(charger: Charger): string {
  if (charger.provenance === "REAL") {
    if (charger.availability === null) return "Status unknown";
    return charger.availability ? "Operational" : "Reported down";
  }
  if (charger.availability === null) return "Status unknown";
  return charger.availability ? "Live" : "Offline";
}

export function ChargerCard({
  charger,
  km,
  freeCount,
  totalCount,
  rank,
  origin,
  selected = false,
  onSelect,
}: ChargerCardProps) {
  const isReal = charger.provenance === "REAL";
  const tight = freeCount <= 1;
  const bookable = isChargerBookable(charger);

  function handleNavigate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const from = origin ? `${origin.latitude},${origin.longitude}&` : "";
    const url = `https://www.google.com/maps/dir/?api=1&${from ? `origin=${from}` : ""}destination=${charger.latitude},${charger.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      id={`charger-card-${charger.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(charger.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(charger.id);
        }
      }}
      className={`block rounded-[22px] border bg-driver-card px-4 py-4 shadow-[0_8px_24px_rgba(16,24,20,0.04)] ${
        selected ? "border-emerald-500 ring-2 ring-emerald-400/40" : "border-driver-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            {rank !== undefined ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-driver-ink text-[9px] font-bold text-driver-bg">
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
            <> · {availabilityCopy(charger)}</>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {!bookable ? (
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
              <p className={`text-[12px] ${charger.availability === true ? "text-[#0b7a52]" : charger.availability === false ? "text-[#b78100]" : "text-driver-muted"}`}>
                {charger.availability === true ? "No wait" : charger.availability === false ? "In use" : "Unknown"}
              </p>
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-[12px] text-driver-muted">
        {formatKm(km)}
        <span className="mx-2 text-driver-line">|</span>
        {charger.power_kw !== null ? `${charger.power_kw} kW` : "Power unknown"}
        <span className="mx-2 text-driver-line">|</span>
        {charger.price_per_kwh !== null ? formatInr(charger.price_per_kwh) : "Price unknown"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          to={`/driver/charger/${charger.id}`}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center rounded-full border border-driver-line bg-driver-bg px-2.5 py-1 text-[10px] font-bold text-driver-ink"
        >
          View Details
        </Link>
        {bookable ? (
          <Link
            to={`/driver/charger/${charger.id}/book`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full bg-vo-accent px-2.5 py-1 text-[10px] font-bold text-[#06231b]"
          >
            <Calendar size={10} />
            Book Now
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleNavigate}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
        >
          <Navigation size={10} />
          Navigate
        </button>
      </div>
    </div>
  );
}
