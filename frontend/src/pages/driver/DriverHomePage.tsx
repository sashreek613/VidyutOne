import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";

import { BatteryCard } from "../../components/driver/BatteryCard";
import { ChargerCard } from "../../components/driver/ChargerCard";
import { DriverMap } from "../../components/driver/DriverMap";
import { StatusBar } from "../../components/driver/StatusBar";
import { ScreenState } from "../../components/common/ScreenState";
import { useChargers } from "../../hooks/useApiData";
import { greetingForHour } from "../../utils/format";
import { centroid, haversineKm } from "../../utils/geo";

export function DriverHomePage() {
  const { data: chargers, error, loading } = useChargers();
  const [query, setQuery] = useState("");
  const hour = new Date().getHours();

  const origin = useMemo(() => centroid(chargers ?? []), [chargers]);
  const ranked = useMemo(() => {
    const list = chargers ?? [];
    return list
      .map((charger) => ({
        charger,
        km: haversineKm(origin.latitude, origin.longitude, charger.latitude, charger.longitude),
        freeCount: list.filter((item) => item.site_id === charger.site_id && item.availability).length,
        totalCount: list.filter((item) => item.site_id === charger.site_id).length,
      }))
      .filter((row) => row.charger.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.km - b.km);
  }, [chargers, origin, query]);

  return (
    <div className="flex min-h-screen flex-col pb-8">
      <StatusBar />
      <div className="px-5 pt-4">
        <p className="text-[11px] tracking-[0.2em] text-driver-muted">BENGALURU</p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-[28px] font-semibold tracking-tight">{greetingForHour(hour)}, Nikhil</h1>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111417] text-[12px] font-semibold text-white">
            NK
          </span>
        </div>
        <div className="mt-4">
          <BatteryCard percent={42} rangeKm={86} />
        </div>
        <label className="mt-4 flex h-12 items-center gap-3 rounded-full border border-driver-line bg-white px-3 shadow-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-vo-accent text-[#06231b]">
            <ArrowUpRight size={14} />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Where are you going?"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-driver-muted"
          />
        </label>
      </div>

      <ScreenState loading={loading} error={error} empty={!loading && ranked.length === 0} tone="light">
        <div className="mt-4 px-5">
          <div className="h-[210px] overflow-hidden rounded-[28px]">
            <DriverMap chargers={chargers ?? []} origin={origin} />
          </div>
          <div className="mt-5 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Nearby chargers</h2>
            <span className="text-[13px] text-[#0b7a52]">Map view</span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {ranked.map((row) => (
              <ChargerCard
                key={row.charger.id}
                charger={row.charger}
                km={row.km}
                freeCount={row.freeCount}
                totalCount={row.totalCount}
              />
            ))}
          </div>
        </div>
      </ScreenState>
    </div>
  );
}
