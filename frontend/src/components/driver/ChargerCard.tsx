import { Link } from "react-router-dom";

import type { Charger } from "../../types";
import { formatInr, formatKm } from "../../utils/format";

interface ChargerCardProps {
  charger: Charger;
  km: number;
  freeCount: number;
  totalCount: number;
}

export function ChargerCard({ charger, km, freeCount, totalCount }: ChargerCardProps) {
  const tight = freeCount <= 1;
  return (
    <Link
      to={`/driver/charger/${charger.id}`}
      className="block rounded-[22px] border border-driver-line bg-white px-4 py-4 shadow-[0_8px_24px_rgba(16,24,20,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-semibold text-driver-ink">{charger.name.replace(" (demo)", "")}</p>
          <p className="mt-0.5 text-[12px] text-driver-muted">
            {charger.connector_type} · {charger.availability ? "Live" : "Offline"}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${
              tight ? "bg-[#fff4d9] text-[#b78100]" : "bg-driver-mint text-[#0b7a52]"
            }`}
          >
            {freeCount} OF {totalCount} FREE
          </span>
          <p className={`mt-1 text-[12px] ${charger.availability ? "text-[#0b7a52]" : "text-[#b78100]"}`}>
            {charger.availability ? "No wait" : "In use"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-driver-muted">
        {formatKm(km)}
        <span className="mx-2 text-driver-line">|</span>
        {charger.power_kw} kW
        <span className="mx-2 text-driver-line">|</span>
        {formatInr(charger.price_per_kwh)}
      </p>
    </Link>
  );
}
