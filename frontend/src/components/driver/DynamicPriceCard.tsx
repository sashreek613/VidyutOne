import { useEffect, useState } from "react";
import { Zap, Clock, ShieldCheck, ArrowDownCircle } from "lucide-react";
import { getSlotPrice } from "../../services/api";
import type { PricingTier } from "../../types";

interface DynamicPriceCardProps {
  slotIso: string;
  basePrice?: number;
}

export function DynamicPriceCard({ slotIso, basePrice = 120.0 }: DynamicPriceCardProps) {
  const [pricing, setPricing] = useState<PricingTier | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slotIso) return;
    let cancelled = false;
    async function fetchPricing() {
      setLoading(true);
      try {
        const res = await getSlotPrice(slotIso, basePrice);
        if (!cancelled) setPricing(res);
      } catch {
        if (!cancelled) setPricing(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchPricing();
    return () => {
      cancelled = true;
    };
  }, [slotIso, basePrice]);

  if (loading || !pricing) {
    return (
      <div className="rounded-xl border border-vo-line bg-vo-card/60 p-3.5 animate-pulse text-xs text-vo-muted">
        Calculating slot dynamic grid pricing…
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 space-y-2.5 transition-all ${
        pricing.is_off_peak
          ? "border-emerald-500/30 bg-emerald-500/10"
          : pricing.is_peak
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-vo-line bg-vo-card/80"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className={`w-4 h-4 ${pricing.is_off_peak ? "text-emerald-400" : pricing.is_peak ? "text-amber-400" : "text-vo-muted"}`} />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {pricing.is_off_peak ? "Off-Peak Managed Window" : pricing.is_peak ? "Peak Demand Window" : "Standard Rate Window"}
          </span>
        </div>

        {pricing.is_off_peak ? (
          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-black">
            <ArrowDownCircle className="w-3 h-3" />
            <span>SAVE ₹{pricing.savings_amount}</span>
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div>
          <p className="text-xs text-vo-muted">{pricing.description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold font-mono text-white">₹{pricing.price}</div>
          {pricing.is_off_peak ? (
            <div className="text-[10px] text-vo-muted line-through font-mono">₹{Math.round(pricing.price + pricing.savings_amount)}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
