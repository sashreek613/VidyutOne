import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";

import { DriverMap } from "../../components/driver/DriverMap";
import { StatusBar } from "../../components/driver/StatusBar";
import { ScreenState } from "../../components/common/ScreenState";
import { useCharger, useChargers } from "../../hooks/useApiData";
import { formatInr, formatKm } from "../../utils/format";
import { centroid, haversineKm } from "../../utils/geo";

export function ChargerDetailsPage() {
  const { chargerId } = useParams<{ chargerId: string }>();
  const navigate = useNavigate();
  const { data: charger, error, loading } = useCharger(chargerId);
  const all = useChargers();

  const origin = useMemo(() => centroid(all.data ?? []), [all.data]);
  const siblings = useMemo(
    () => (all.data ?? []).filter((item) => charger && item.site_id === charger.site_id),
    [all.data, charger],
  );
  const km = charger ? haversineKm(origin.latitude, origin.longitude, charger.latitude, charger.longitude) : 0;
  const freeCount = siblings.filter((item) => item.availability).length;

  return (
    <div className="flex min-h-screen flex-col bg-driver-bg pb-28">
      <div className="relative h-[210px]">
        {charger ? (
          <DriverMap chargers={siblings.length ? siblings : [charger]} origin={origin} />
        ) : (
          <div className="h-full bg-[#e7ebe8]" />
        )}
        <div className="absolute inset-x-0 top-0">
          <StatusBar />
          <button
            type="button"
            onClick={() => void navigate(-1)}
            className="ml-5 mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>

      <ScreenState loading={loading} error={error} tone="light">
        {charger ? (
          <div className="px-5 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-[28px] leading-tight font-semibold">{charger.name.replace(" (demo)", "")}</h1>
                <p className="mt-1 text-[13px] text-driver-muted">
                  {charger.connector_type} · demo location
                </p>
                <p className="mt-2 text-[12px] text-[#0b7a52]">
                  ● {charger.availability ? "Verified working" : "Reported offline"} · {charger.availability ? "98% uptime" : "Check before travel"}
                </p>
              </div>
              <span className="rounded-full bg-driver-mint px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-[#0b7a52]">
                {freeCount} OF {siblings.length || 1} FREE
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="DISTANCE" value={formatKm(km)} />
              <Metric label="ETA" value={`${Math.max(4, Math.round(km * 4))} min`} />
              <Metric label="POWER" value={`${charger.power_kw} kW`} />
              <Metric label="TARIFF" value={`${formatInr(charger.price_per_kwh)} /kWh`} />
              <Metric label="WAIT" value={charger.availability ? "0 min" : "18 min"} />
              <Metric label="CONNECTOR" value={charger.connector_type} />
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold">Connectors</h2>
                <span className="text-[10px] tracking-[0.14em] text-driver-muted">LIVE</span>
              </div>
              <ul className="mt-3 divide-y divide-driver-line">
                {(siblings.length ? siblings : [charger]).map((bay, index) => (
                  <li key={bay.id} className="flex items-center justify-between py-3 text-[13px]">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${bay.availability ? "bg-[#00c98a]" : "bg-vo-amber"}`} />
                      <span>
                        BAY {String(index + 1).padStart(2, "0")} · {bay.connector_type} · {bay.power_kw} kW
                      </span>
                    </div>
                    <span className={bay.availability ? "text-[#0b7a52]" : "text-[#b78100]"}>
                      {bay.availability ? "FREE" : "IN USE"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to={`/driver/charger/${charger.id}/book`}
              className="fixed bottom-5 left-1/2 z-10 flex h-12 w-[min(382px,calc(100%-40px))] -translate-x-1/2 items-center justify-center rounded-2xl bg-vo-accent text-[14px] font-semibold text-[#06231b]"
            >
              Pick charging window
            </Link>
          </div>
        ) : null}
      </ScreenState>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white px-4 py-3 shadow-[0_8px_20px_rgba(16,24,20,0.04)]">
      <p className="text-[10px] tracking-[0.16em] text-driver-muted">{label}</p>
      <p className="mt-1 text-[18px] font-semibold">{value}</p>
    </div>
  );
}
