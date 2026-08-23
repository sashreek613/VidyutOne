import { useState, type FormEvent } from "react";
import { X, Zap, Trash2 } from "lucide-react";
import type { Vehicle, VehicleCreate, VehicleUpdate } from "../../types";

interface VehicleModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: (payload: VehicleCreate | VehicleUpdate) => Promise<void>;
  onDelete?: (vehicleId: string) => Promise<void>;
}

export function VehicleModal({
  isOpen,
  vehicle,
  onClose,
  onSave,
  onDelete,
}: VehicleModalProps) {
  const [make, setMake] = useState(vehicle?.make ?? "Tata");
  const [model, setModel] = useState(vehicle?.model ?? "Nexon EV");
  const [capacity, setCapacity] = useState(vehicle?.battery_capacity_kwh ?? 40.5);
  const [efficiency, setEfficiency] = useState(vehicle?.efficiency_wh_km ?? 145);
  const [currentPct, setCurrentPct] = useState(vehicle?.current_battery_pct ?? 50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({
        make,
        model,
        battery_capacity_kwh: Number(capacity),
        efficiency_wh_km: Number(efficiency),
        current_battery_pct: Number(currentPct),
        is_primary: true,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save vehicle profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!vehicle || !onDelete) return;
    if (!confirm("Are you sure you want to remove this vehicle?")) return;
    setSaving(true);
    try {
      await onDelete(vehicle.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete vehicle.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-vo-line bg-[#0d131f] p-6 shadow-2xl space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-vo-muted hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5 text-emerald-400">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-white">
            {vehicle ? "Edit EV Specs" : "Add Your EV"}
          </h2>
        </div>

        {error ? <p className="text-xs text-vo-red">{error}</p> : null}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-vo-muted mb-1 uppercase tracking-wider">Manufacturer / Make</label>
            <input
              type="text"
              required
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="e.g. Tata / MG / Hyundai"
              className="w-full rounded-xl border border-vo-line bg-vo-card px-3 py-2.5 text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-vo-muted mb-1 uppercase tracking-wider">Model</label>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Nexon EV / ZS EV / Ioniq 5"
              className="w-full rounded-xl border border-vo-line bg-vo-card px-3 py-2.5 text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-vo-muted mb-1 uppercase tracking-wider">Capacity (kWh)</label>
              <input
                type="number"
                step="0.1"
                min="5"
                max="200"
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full rounded-xl border border-vo-line bg-vo-card px-3 py-2.5 text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-vo-muted mb-1 uppercase tracking-wider">Efficiency (Wh/km)</label>
              <input
                type="number"
                step="1"
                min="50"
                max="400"
                required
                value={efficiency}
                onChange={(e) => setEfficiency(Number(e.target.value))}
                className="w-full rounded-xl border border-vo-line bg-vo-card px-3 py-2.5 text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between font-semibold text-vo-muted mb-1 uppercase tracking-wider">
              <span>Current Battery %</span>
              <span className="text-emerald-400 font-mono">{currentPct}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={currentPct}
              onChange={(e) => setCurrentPct(Number(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            {vehicle && onDelete ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                title="Delete Vehicle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : <div />}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-vo-line text-vo-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold transition-all shadow-md shadow-emerald-400/10"
              >
                {saving ? "Saving…" : "Save Vehicle"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
