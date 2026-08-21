import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { StatusBar } from "../../components/driver/StatusBar";
import { ScreenState } from "../../components/common/ScreenState";
import { useAuth } from "../../hooks/useAuth";
import { createBooking } from "../../services/api";
import { useCharger } from "../../hooks/useApiData";
import { formatInr } from "../../utils/format";
import { getErrorMessage } from "../../utils/errors";

interface WindowOption {
  id: string;
  label: string;
  hint: string;
  price: number;
  tariff: number;
  offsetMinutes: number;
}

const WINDOWS: WindowOption[] = [
  {
    id: "now",
    label: "Charge now",
    hint: "20:15 · feeder at 92% of peak",
    price: 142,
    tariff: 18.48,
    offsetMinutes: 0,
  },
  {
    id: "later",
    label: "Book 35 min later",
    hint: "20:50 · off-peak window opens",
    price: 98,
    tariff: 12.7,
    offsetMinutes: 35,
  },
  {
    id: "night",
    label: "Tonight, 23:10",
    hint: "Cheapest window · slow 22 kW AC",
    price: 86,
    tariff: 11.18,
    offsetMinutes: 175,
  },
];

export function ChargingWindowPage() {
  const { chargerId } = useParams<{ chargerId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: charger, error, loading } = useCharger(chargerId);
  const [selectedId, setSelectedId] = useState("later");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selected = WINDOWS.find((item) => item.id === selectedId) ?? WINDOWS[1]!;
  const peakPrice = WINDOWS[0]!.price;
  const savings = peakPrice - selected.price;
  const savingsPct = Math.round((savings / peakPrice) * 100);

  const summary = useMemo(
    () => [
      { label: "Energy added", value: "7.7 kWh · 42% → 80%" },
      { label: "Charging time", value: selected.id === "night" ? "52 min" : "38 min" },
      { label: "Tariff", value: `${formatInr(selected.tariff)} / kWh` },
      { label: "Total", value: formatInr(selected.price) },
    ],
    [selected],
  );

  async function confirm() {
    if (!charger) {
      return;
    }
    if (!profile) {
      setSubmitError("You must be signed in to book a charger.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const slot = new Date(Date.now() + selected.offsetMinutes * 60_000);
      const booking = await createBooking({
        charger_id: charger.id,
        slot_time: slot.toISOString(),
        price: selected.price,
      });
      void navigate(`/driver/booking/${booking.id}`);
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white pb-28">
      <StatusBar />
      <ScreenState loading={loading} error={error} tone="light">
        {charger ? (
          <div className="px-5 pt-4">
            <p className="text-[11px] tracking-[0.18em] text-driver-muted">
              — {charger.name.replace(" (demo)", "").toUpperCase()}
            </p>
            <h1 className="mt-2 text-[28px] leading-tight font-semibold">Pick a charging window</h1>
            <p className="mt-2 text-[13px] text-driver-muted">
              Off-peak windows cost less because the feeder is under less load.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {WINDOWS.map((item) => {
                const active = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`flex items-center justify-between rounded-[18px] px-4 py-3.5 text-left ${
                      active ? "bg-[#111417] text-white" : "bg-[#f6f7f4] text-driver-ink"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          active ? "border-vo-accent bg-vo-accent" : "border-driver-muted"
                        }`}
                      >
                        {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#111417]" /> : null}
                      </span>
                      <span>
                        <span className="block text-[15px] font-semibold">{item.label}</span>
                        <span className={`block text-[12px] ${active ? "text-white/60" : "text-driver-muted"}`}>
                          {item.hint}
                        </span>
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[16px] font-semibold">{formatInr(item.price)}</span>
                      <span className={`block text-[11px] ${active ? "text-white/60" : "text-driver-muted"}`}>
                        {formatInr(item.tariff)} / kWh
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-[18px] bg-driver-mint px-4 py-3 text-[13px] text-[#0b7a52]">
              <div className="flex items-center justify-between font-medium">
                <span>You save {formatInr(savings)}</span>
                <span>{savingsPct}% cheaper</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/70">
                <div className="h-full rounded-full bg-vo-accent" style={{ width: `${Math.min(100, savingsPct)}%` }} />
              </div>
            </div>

            <dl className="mt-5">
              {summary.map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-driver-line py-3 text-[13px]">
                  <dt className="text-driver-muted">{row.label}</dt>
                  <dd className="font-semibold">{row.value}</dd>
                </div>
              ))}
            </dl>
            {submitError ? <p className="mt-3 text-[13px] text-vo-red">{submitError}</p> : null}
            <button
              type="button"
              disabled={submitting}
              onClick={() => void confirm()}
              className="fixed bottom-5 left-1/2 flex h-12 w-[min(382px,calc(100%-40px))] -translate-x-1/2 items-center justify-center rounded-2xl bg-vo-accent text-[14px] font-semibold text-[#06231b] disabled:opacity-60"
            >
              {submitting ? "Booking…" : `Confirm booking · ${formatInr(selected.price)}`}
            </button>
          </div>
        ) : null}
      </ScreenState>
    </div>
  );
}
