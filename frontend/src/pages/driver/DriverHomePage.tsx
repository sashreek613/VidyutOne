import { ArrowUpRight, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { VehicleWidget } from "../../components/driver/VehicleWidget";
import { VehicleModal } from "../../components/driver/VehicleModal";
import { ChargerCard } from "../../components/driver/ChargerCard";
import { DriverMap } from "../../components/driver/DriverMap";
import { StatusBar } from "../../components/driver/StatusBar";
import { ScreenState } from "../../components/common/ScreenState";
import { useChargers } from "../../hooks/useApiData";
import { useAuth } from "../../hooks/useAuth";
import { createVehicle, deleteVehicle, getVehicles, updateVehicle } from "../../services/api";
import type { Vehicle, VehicleCreate, VehicleUpdate } from "../../types";
import { firstNameFromFullName, greetingForHour, initialsFromName } from "../../utils/format";
import { centroid, haversineKm } from "../../utils/geo";

export function DriverHomePage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { data: chargers, error, loading } = useChargers();
  const [query, setQuery] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const hour = new Date().getHours();

  const primaryVehicle = useMemo(
    () => vehicles.find((v) => v.is_primary) ?? vehicles[0] ?? null,
    [vehicles],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadVehicles() {
      try {
        const list = await getVehicles();
        if (!cancelled) setVehicles(list);
      } catch {
        // Ignored if unauthenticated or error
      }
    }
    void loadVehicles();
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function handleSaveVehicle(payload: VehicleCreate | VehicleUpdate) {
    if (editingVehicle) {
      const updated = await updateVehicle(editingVehicle.id, payload as VehicleUpdate);
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    } else {
      const created = await createVehicle(payload as VehicleCreate);
      setVehicles((prev) => [created, ...prev]);
    }
  }

  async function handleDeleteVehicle(vehicleId: string) {
    await deleteVehicle(vehicleId);
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
  }

  async function handleUpdateBattery(vehicleId: string, newPct: number) {
    const updated = await updateVehicle(vehicleId, { current_battery_pct: newPct });
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0f17] text-white pb-8">
      <StatusBar />
      <div className="px-5 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">EV Driver Portal</p>
            <h1 className="text-[26px] font-bold tracking-tight">
              {greetingForHour(hour)}, {firstNameFromFullName(profile?.full_name ?? "there")}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[13px] font-bold text-emerald-400">
              {initialsFromName(profile?.full_name ?? "Driver")}
            </span>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => navigate("/", { replace: true }));
              }}
              className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Vehicle Widget */}
        <VehicleWidget
          vehicle={primaryVehicle}
          onAddVehicle={() => {
            setEditingVehicle(null);
            setModalOpen(true);
          }}
          onEditVehicle={(v) => {
            setEditingVehicle(v);
            setModalOpen(true);
          }}
          onUpdateBattery={handleUpdateBattery}
        />

        <Link
          to="/driver/savings"
          className="block rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent p-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            Charging cost & savings
          </p>
          <p className="mt-1 text-[16px] font-bold text-white">See live tariffs, history, and off-peak savings</p>
          <p className="mt-1 text-[12px] text-vo-muted">Powered by the existing pricing engine · your bookings only</p>
        </Link>

        <label className="flex h-12 items-center gap-3 rounded-2xl border border-vo-line bg-vo-card px-4 shadow-inner">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-400 text-black shrink-0">
            <ArrowUpRight size={14} />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nearby chargers or area..."
            className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-vo-muted"
          />
        </label>
      </div>

      <ScreenState loading={loading} error={error} empty={!loading && ranked.length === 0}>
        <div className="mt-4 px-5 space-y-4">
          <div className="h-[210px] overflow-hidden rounded-2xl border border-vo-line">
            <DriverMap chargers={chargers ?? []} origin={origin} />
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-white">Reachable Chargers</h2>
            <span className="text-[12px] text-emerald-400 font-mono">{ranked.length} Available</span>
          </div>
          <div className="flex flex-col gap-3">
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

      {/* Vehicle Modal Dialog */}
      <VehicleModal
        isOpen={modalOpen}
        vehicle={editingVehicle}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveVehicle}
        onDelete={handleDeleteVehicle}
      />
    </div>
  );
}
