import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ScreenState } from "../../components/common/ScreenState";
import { PeakOffPeakCompare } from "../../components/driver/PeakOffPeakCompare";
import { StatusBar } from "../../components/driver/StatusBar";
import { useChargers, useChargingSummary } from "../../hooks/useApiData";
import { getPricingSchedule, getVehicles } from "../../services/api";
import type { PricingTier, Vehicle } from "../../types";
import { estimatedEnergyKwh, nextUtcHour, sessionTotal } from "../../utils/chargingEnergy";
import { getErrorMessage } from "../../utils/errors";
import { formatInr, formatKwh } from "../../utils/format";

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DriverSavingsPage() {
  const { data: summary, error, loading } = useChargingSummary();
  const chargersQuery = useChargers();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [quote, setQuote] = useState<{
    peak: PricingTier;
    offPeak: PricingTier;
    now: PricingTier;
    energyKwh: number;
    stationName: string;
  } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const primaryVehicle = useMemo(
    () => vehicles?.find((item) => item.is_primary) ?? vehicles?.[0] ?? null,
    [vehicles],
  );

  useEffect(() => {
    let cancelled = false;
    void getVehicles()
      .then((list) => {
        if (!cancelled) {
          setVehicles(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVehicles([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Deliberately the first BOOKABLE charger, not just data[0] -- a REAL
    // (OpenChargeMap) charger has no meaningful price_per_kwh to quote
    // against (see charger_service.py's provenance split), and picking one
    // here would either crash on a null price or fabricate a number this
    // app has no basis for.
    const charger = chargersQuery.data?.find((item) => item.bookable !== false && item.price_per_kwh !== null);
    if (!charger || vehicles === null || charger.price_per_kwh === null) {
      return;
    }
    const now = new Date();
    const peak = nextUtcHour(19, now);
    const offPeak = nextUtcHour(23, now);
    const energyKwh = estimatedEnergyKwh({
      batteryCapacityKwh: primaryVehicle?.battery_capacity_kwh,
      currentBatteryPct: primaryVehicle?.current_battery_pct,
      chargerPowerKw: charger.power_kw,
    });
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError(null);
    void getPricingSchedule(
      [now.toISOString(), peak.toISOString(), offPeak.toISOString()],
      charger.price_per_kwh,
    )
      .then((schedule) => {
        if (cancelled) {
          return;
        }
        const byHour = new Map(schedule.map((tier) => [new Date(tier.slot_iso).getUTCHours(), tier]));
        const nowTier = schedule[0];
        const peakTier = byHour.get(19) ?? schedule.find((tier) => tier.is_peak);
        const offPeakTier = byHour.get(23) ?? schedule.find((tier) => tier.is_off_peak);
        if (!nowTier || !peakTier || !offPeakTier) {
          setQuote(null);
          return;
        }
        setQuote({
          peak: peakTier,
          offPeak: offPeakTier,
          now: nowTier,
          energyKwh,
          stationName: charger.name.replace(" (demo)", ""),
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setQuoteLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chargersQuery.data, primaryVehicle, vehicles]);

  const month = summary?.month;
  const hasHistory = (summary?.history.length ?? 0) > 0;
  const energyTrend = (summary?.trend ?? []).filter((point) => point.energy_kwh != null);
  const last = summary?.last_session ?? null;
  const peakTotal = quote ? sessionTotal(quote.energyKwh, quote.peak.price) : null;
  const offPeakTotal = quote ? sessionTotal(quote.energyKwh, quote.offPeak.price) : null;
  const nowTotal = quote ? sessionTotal(quote.energyKwh, quote.now.price) : null;
  const savingsTotal =
    peakTotal != null && offPeakTotal != null ? Math.round((peakTotal - offPeakTotal) * 100) / 100 : null;
  const savingsPct =
    peakTotal != null && savingsTotal != null && peakTotal > 0
      ? Math.round((savingsTotal / peakTotal) * 100)
      : null;
  const cheaper: "peak" | "off-peak" | "same" =
    quote && quote.offPeak.price < quote.peak.price
      ? "off-peak"
      : quote && quote.peak.price < quote.offPeak.price
        ? "peak"
        : "same";

  return (
    <div className="flex min-h-screen flex-col bg-driver-bg pb-10 text-driver-ink">
      <StatusBar />
      <div className="px-5 pt-3">
        <Link to="/driver" className="inline-flex items-center gap-1 text-[12px] text-emerald-400">
          <ArrowLeft size={14} />
          Home
        </Link>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Driver</p>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight">Charging Cost & Savings</h1>
        <p className="mt-1 text-[13px] text-vo-muted">
          Live tariffs from the existing pricing engine. History from your bookings only.
        </p>
      </div>

      <div className="mt-5 space-y-5 px-5">
        <section className="space-y-3 rounded-2xl border border-vo-line bg-[#111827] p-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-vo-muted">
            Next charge estimate
          </h2>
          {quoteLoading ? <p className="text-[13px] text-vo-muted">Loading live tariff…</p> : null}
          {quoteError ? <p className="text-[13px] text-vo-red">{quoteError}</p> : null}
          {!quoteLoading && !quote && !quoteError ? (
            <p className="text-[13px] text-vo-muted">
              Station data is needed to estimate the next charge. Try again after chargers load.
            </p>
          ) : null}
          {quote ? (
            <>
              <p className="text-[12px] text-vo-muted">{quote.stationName}</p>
              <p className="text-[28px] font-bold">{nowTotal != null ? formatInr(nowTotal) : "—"}</p>
              <p className="text-[13px] text-vo-muted">
                {formatKwh(quote.energyKwh)} ·{" "}
                {quote.now.is_off_peak ? "Off-Peak" : quote.now.is_peak ? "Peak" : "Standard"}
              </p>
              <PeakOffPeakCompare
                peakTariff={quote.peak.price}
                offPeakTariff={quote.offPeak.price}
                peakTotal={peakTotal}
                offPeakTotal={offPeakTotal}
                savingsTotal={savingsTotal}
                savingsPct={savingsPct}
                cheaper={cheaper}
                tone="dark"
              />
              {cheaper === "off-peak" && savingsTotal != null && savingsTotal > 0 ? (
                <div className="rounded-xl bg-emerald-500/10 px-3 py-3 text-[13px] text-emerald-300">
                  <p className="font-semibold">Best time to charge · Off-Peak</p>
                  <p className="mt-0.5">Estimated saving {formatInr(savingsTotal)} vs Peak</p>
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        <ScreenState loading={loading} error={error}>
          {summary ? (
            <>
              <section className="rounded-2xl border border-vo-line bg-[#111827] p-4">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-vo-muted">
                  Monthly summary
                </h2>
                {month && month.sessions > 0 ? (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Metric label="Cost" value={month.cost != null ? formatInr(month.cost) : "—"} />
                      <Metric label="Savings" value={month.savings != null ? formatInr(month.savings) : "—"} />
                      <Metric
                        label="Energy"
                        value={month.energy_kwh != null ? formatKwh(month.energy_kwh) : "—"}
                      />
                      <Metric label="Sessions" value={String(month.sessions)} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Metric
                        label="Avg / session"
                        value={
                          month.avg_cost_per_session != null ? formatInr(month.avg_cost_per_session) : "—"
                        }
                      />
                      <Metric
                        label="Avg / kWh"
                        value={month.avg_cost_per_kwh != null ? formatInr(month.avg_cost_per_kwh) : "—"}
                      />
                    </div>
                    {summary.total_energy_kwh != null ? (
                      <div className="mt-3 rounded-xl border border-vo-line bg-vo-card/60 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-wider text-vo-muted">
                          Total energy charged
                        </p>
                        <p className="mt-1 text-[22px] font-bold">{formatKwh(summary.total_energy_kwh)}</p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <EmptyHistory />
                )}
              </section>

              {summary.insight ? (
                <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-200">
                  {summary.insight.text}
                </section>
              ) : null}

              <section className="rounded-2xl border border-vo-line bg-[#111827] p-4">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-vo-muted">Cost trend</h2>
                {summary.trend.length > 0 ? (
                  <div className="mt-3 h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <XAxis dataKey="label" tick={{ fill: "#8b93a1", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#8b93a1", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          contentStyle={{
                            background: "#171d25",
                            border: "1px solid #27303b",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value) => formatInr(Number(value ?? 0))}
                        />
                        <Bar dataKey="cost" fill="#00e8a2" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] text-vo-muted">
                    Cost trend appears after you complete charging sessions.
                  </p>
                )}
              </section>

              {energyTrend.length >= 2 ? (
                <section className="rounded-2xl border border-vo-line bg-[#111827] p-4">
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-vo-muted">
                    Energy trend
                  </h2>
                  <div className="mt-3 h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={energyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <XAxis dataKey="label" tick={{ fill: "#8b93a1", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#8b93a1", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          contentStyle={{
                            background: "#171d25",
                            border: "1px solid #27303b",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value) => `${Number(value ?? 0).toFixed(1)} kWh`}
                        />
                        <Bar dataKey="energy_kwh" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              ) : null}

              <section className="rounded-2xl border border-vo-line bg-[#111827] p-4">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-vo-muted">
                  Charging history
                </h2>
                {hasHistory ? (
                  <ul className="mt-3 divide-y divide-vo-line">
                    {summary.history.map((row) => (
                      <li key={row.booking_id} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[14px] font-semibold">{row.station_name}</p>
                            <p className="text-[12px] text-vo-muted">
                              {formatSessionDate(row.slot_time)} · {row.window_label}
                            </p>
                          </div>
                          <p className="text-[14px] font-semibold">{formatInr(row.cost)}</p>
                        </div>
                        <p className="mt-1 text-[12px] text-vo-muted">
                          {row.energy_kwh != null ? formatKwh(row.energy_kwh) : "Energy unavailable"}
                          {row.savings != null && row.savings > 0 ? ` · Saved ${formatInr(row.savings)}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyHistory />
                )}
              </section>

              <section className="rounded-2xl border border-vo-line bg-[#111827] p-4">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-vo-muted">
                  Last charging session
                </h2>
                {last ? (
                  <dl className="mt-3 space-y-2 text-[13px]">
                    <Row label="Station" value={last.station_name} />
                    <Row label="Date" value={formatSessionDate(last.slot_time)} />
                    <Row
                      label="Energy"
                      value={last.energy_kwh != null ? formatKwh(last.energy_kwh) : "Unavailable"}
                    />
                    <Row label="Cost" value={formatInr(last.cost)} />
                    <Row label="Window" value={last.window_label} />
                  </dl>
                ) : (
                  <p className="mt-3 text-[13px] text-vo-muted">No previous charging sessions.</p>
                )}
              </section>
            </>
          ) : null}
        </ScreenState>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-vo-line bg-vo-card/60 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-vo-muted">{label}</p>
      <p className="mt-1 text-[16px] font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-vo-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5 px-3 py-4">
      <p className="text-[14px] font-semibold text-driver-ink">No charging history yet</p>
      <p className="mt-1 text-[12px] text-vo-muted">
        Savings and trends appear after you complete charging sessions. Nothing here is invented.
      </p>
    </div>
  );
}
