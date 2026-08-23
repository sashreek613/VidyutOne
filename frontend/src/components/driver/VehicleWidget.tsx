import { useState } from "react";
import { Battery, Gauge, Zap, Plus, Edit2, RefreshCw } from "lucide-react";
import type { Vehicle } from "../../types";

interface VehicleWidgetProps {
  vehicle: Vehicle | null;
  onAddVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onUpdateBattery: (vehicleId: string, newPct: number) => Promise<void>;
}

export function VehicleWidget({
  vehicle,
  onAddVehicle,
  onEditVehicle,
  onUpdateBattery,
}: VehicleWidgetProps) {
  const [updating, setUpdating] = useState(false);
  const [tempPct, setTempPct] = useState<number | null>(null);

  if (!vehicle) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-5 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Add your EV for smarter recommendations</h3>
          <p className="text-xs text-vo-muted mt-1">
            Calculate your estimated range and filter chargers you can reach.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddVehicle}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-xs transition-all shadow-md shadow-emerald-400/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add Your EV</span>
        </button>
      </div>
    );
  }

  // Range math: (capacity * pct / 100) / (efficiency / 1000)
  const currentPct = tempPct ?? vehicle.current_battery_pct;
  const availableKwh = (vehicle.battery_capacity_kwh * currentPct) / 100;
  const kwhPerKm = vehicle.efficiency_wh_km / 1000;
  const estimatedRangeKm = Math.round(availableKwh / (kwhPerKm || 0.15));

  async function handleSliderCommit(newVal: number) {
    setUpdating(true);
    try {
      await onUpdateBattery(vehicle!.id, newVal);
    } finally {
      setUpdating(false);
      setTempPct(null);
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#111827] to-[#0d131f] p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Your Vehicle</div>
            <h3 className="text-base font-bold text-white">
              {vehicle.make} {vehicle.model}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onEditVehicle(vehicle)}
          className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
          title="Edit Vehicle"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Battery Card */}
        <div className="rounded-xl border border-vo-line bg-vo-card/80 p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1.5 text-xs text-vo-muted mb-1">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span>Battery Level</span>
          </div>
          <div className="text-xl font-bold text-white flex items-baseline space-x-1">
            <span>{Math.round(currentPct)}</span>
            <span className="text-xs font-normal text-emerald-400">%</span>
          </div>
        </div>

        {/* Range Card */}
        <div className="rounded-xl border border-vo-line bg-vo-card/80 p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1.5 text-xs text-vo-muted mb-1">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span>Est. Range</span>
          </div>
          <div className="text-xl font-bold text-white flex items-baseline space-x-1">
            <span>{estimatedRangeKm}</span>
            <span className="text-xs font-normal text-cyan-400">km</span>
          </div>
        </div>
      </div>

      {/* Battery Percentage Slider */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs text-vo-muted">
          <span className="flex items-center space-x-1">
            <span>Update Charge</span>
            {updating ? <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" /> : null}
          </span>
          <span className="font-mono text-emerald-400">{Math.round(currentPct)}%</span>
        </div>
        <input
          type="range"
          min="5"
          max="100"
          value={currentPct}
          onChange={(e) => setTempPct(Number(e.target.value))}
          onMouseUp={(e) => void handleSliderCommit(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => void handleSliderCommit(Number((e.target as HTMLInputElement).value))}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
        />
      </div>
    </div>
  );
}
