import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, Smartphone, Wallet } from "lucide-react";

import { StatusBar } from "../../components/driver/StatusBar";
import { DynamicPriceCard } from "../../components/driver/DynamicPriceCard";
import { PeakOffPeakCompare } from "../../components/driver/PeakOffPeakCompare";
import { ScreenState } from "../../components/common/ScreenState";
import { useAuth } from "../../hooks/useAuth";
import { useCharger } from "../../hooks/useApiData";
import { createBooking, getChargingQuote, getVehicles } from "../../services/api";
import type { ChargingSlotQuote, PricingTier, Vehicle } from "../../types";
import { nextUtcHour } from "../../utils/chargingEnergy";
import { getErrorMessage } from "../../utils/errors";
import { formatInr, formatKwh } from "../../utils/format";

interface WindowChoice {
  id: "now" | "later" | "night";
  label: string;
  slot: Date;
}

function windowChoices(now: Date): WindowChoice[] {
  return [
    { id: "now", label: "Charge now", slot: now },
    {
      id: "later",
      label: "In 35 minutes",
      slot: new Date(now.getTime() + 35 * 60_000),
    },
    { id: "night", label: "Off-peak night window", slot: nextUtcHour(23, now) },
  ];
}

function formatSlot(slot: Date): string {
  return slot.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

function windowHint(quote: ChargingSlotQuote | undefined, slot: Date): string {
  const time = formatSlot(slot);
  if (!quote) {
    return time;
  }
  if (quote.is_off_peak) {
    return `${time} · Off-Peak`;
  }
  if (quote.is_peak) {
    return `${time} · Peak`;
  }
  return `${time} · Standard`;
}

function instantMs(value: string | Date): number {
  return new Date(value).getTime();
}

function quoteAsPricing(quote: ChargingSlotQuote): PricingTier {
  return {
    slot_iso: quote.slot_time,
    price: quote.tariff_per_kwh,
    is_peak: quote.is_peak,
    is_off_peak: quote.is_off_peak,
    savings_amount: quote.savings_amount,
    description: quote.description,
  };
}

export function ChargingWindowPage() {
  const { chargerId } = useParams<{ chargerId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: charger, error, loading } = useCharger(chargerId);
  const [selectedId, setSelectedId] = useState<WindowChoice["id"]>("later");
  const [bookingStep, setBookingStep] = useState<"select_slot" | "payment">("select_slot");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "wallet">("upi");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [quotesByMs, setQuotesByMs] = useState<Record<number, ChargingSlotQuote>>({});
  const [energyKwh, setEnergyKwh] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [clock] = useState(() => new Date());

  const choices = useMemo(() => windowChoices(clock), [clock]);
  const peakSlot = useMemo(() => nextUtcHour(19, clock), [clock]);
  const offPeakSlot = useMemo(() => nextUtcHour(23, clock), [clock]);
  const selected = choices.find((item) => item.id === selectedId) ?? choices[1]!;

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
    if (!charger) {
      return;
    }
    const slots = [...choices.map((item) => item.slot), peakSlot, offPeakSlot];
    const unique = [...new Set(slots.map((slot) => slot.toISOString()))];
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError(null);
    void getChargingQuote(charger.id, unique)
      .then((result) => {
        if (cancelled) {
          return;
        }
        const next: Record<number, ChargingSlotQuote> = {};
        result.quotes.forEach((quote, index) => {
          const requested = unique[index];
          if (requested) {
            next[instantMs(requested)] = quote;
          } else {
            next[instantMs(quote.slot_time)] = quote;
          }
        });
        setQuotesByMs(next);
        setEnergyKwh(result.energy_kwh);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setQuoteError(getErrorMessage(err));
          setQuotesByMs({});
          setEnergyKwh(null);
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
  }, [charger, choices, offPeakSlot, peakSlot]);

  function lookup(slot: Date): ChargingSlotQuote | undefined {
    return quotesByMs[instantMs(slot)];
  }

  const selectedQuote = lookup(selected.slot);
  const peakQuote = lookup(peakSlot);
  const offPeakQuote = lookup(offPeakSlot);
  const selectedPricing = selectedQuote ? quoteAsPricing(selectedQuote) : undefined;
  const selectedTotal = selectedQuote?.total ?? null;
  const peakTotal = peakQuote?.total ?? null;
  const offPeakTotal = offPeakQuote?.total ?? null;

  const cheaper: "peak" | "off-peak" | "same" =
    peakQuote && offPeakQuote
      ? offPeakQuote.tariff_per_kwh < peakQuote.tariff_per_kwh
        ? "off-peak"
        : peakQuote.tariff_per_kwh < offPeakQuote.tariff_per_kwh
          ? "peak"
          : "same"
      : "same";
  const savingsTotal =
    peakTotal != null && offPeakTotal != null ? Math.round((peakTotal - offPeakTotal) * 100) / 100 : null;
  const savingsPct =
    peakTotal != null && savingsTotal != null && peakTotal > 0
      ? Math.round((savingsTotal / peakTotal) * 100)
      : null;

  const chargeMinutes =
    charger && energyKwh != null && charger.power_kw !== null && charger.power_kw > 0
      ? Math.max(1, Math.round((energyKwh / charger.power_kw) * 60))
      : null;

  async function handleConfirmPayment() {
    if (!charger) {
      return;
    }
    if (charger.bookable === false) {
      setSubmitError("This station is info-only -- booking isn't available for it yet.");
      return;
    }
    if (!profile) {
      setSubmitError("You must be signed in to book a charger.");
      return;
    }
    if (!selectedQuote) {
      setSubmitError("Wait for the live tariff before confirming.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const booking = await createBooking({
        charger_id: charger.id,
        slot_time: selected.slot.toISOString(),
      });
      void navigate(`/driver/booking/${booking.id}`);
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const proceedButtonLabel = selectedTotal != null
    ? `Proceed to Payment · ${formatInr(selectedTotal)}`
    : "Proceed to Payment";

  const payButtonLabel = submitting
    ? "Processing Payment…"
    : selectedTotal != null
      ? `Pay ${formatInr(selectedTotal)}`
      : "Confirm Payment";

  return (
    <div className="flex min-h-screen flex-col bg-white pb-28">
      <StatusBar />
      <ScreenState loading={loading} error={error} tone="light">
        {charger ? (
          <div className="px-5 pt-4">
            <button
              type="button"
              onClick={() => {
                if (bookingStep === "payment") {
                  setBookingStep("select_slot");
                } else {
                  void navigate(-1);
                }
              }}
              className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow border border-driver-line"
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </button>

            {bookingStep === "select_slot" ? (
              <>
                <p className="text-[11px] tracking-[0.18em] text-driver-muted">
                  — {charger.name.replace(" (demo)", "").toUpperCase()}
                </p>
                <h1 className="mt-2 text-[28px] leading-tight font-semibold">Pick a charging window</h1>

                {charger.bookable === false ? (
                  <div className="mt-3 rounded-2xl border border-[#c7d2fe] bg-[#eef2ff] px-4 py-3 text-[13px] text-[#4338ca]">
                    This is a real (OpenChargeMap) station -- info only, booking isn't available for it yet.
                  </div>
                ) : null}

                <p className="mt-2 text-[13px] text-driver-muted">
                  Live tariffs come from the VidyutOne pricing engine. Off-peak windows cost less because the feeder is
                  under less load.
                </p>

                {primaryVehicle ? (
                  <p className="mt-3 text-[12px] text-driver-muted">
                    {primaryVehicle.make} {primaryVehicle.model} · {Math.round(primaryVehicle.current_battery_pct)}% → 80%
                    {energyKwh != null ? ` · ${formatKwh(energyKwh)}` : ""}
                  </p>
                ) : (
                  <p className="mt-3 text-[12px] text-driver-muted">
                    Energy uses a 30-minute session at {charger.power_kw !== null ? `${charger.power_kw} kW` : "an unknown power rating"} until you add a vehicle.
                  </p>
                )}

                <div className="mt-5 flex flex-col gap-2">
                  {choices.map((item) => {
                    const active = item.id === selectedId;
                    const quote = lookup(item.slot);
                    const total = quote?.total ?? null;
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
                              {windowHint(quote, item.slot)}
                            </span>
                          </span>
                        </span>
                        <span className="text-right">
                          {quote ? (
                            <>
                              <span className="block text-[16px] font-semibold">{formatInr(total ?? quote.total)}</span>
                              <span className={`block text-[11px] ${active ? "text-white/60" : "text-driver-muted"}`}>
                                {formatInr(quote.tariff_per_kwh)} / kWh
                              </span>
                            </>
                          ) : (
                            <span className={`text-[12px] ${active ? "text-white/60" : "text-driver-muted"}`}>
                              {quoteLoading ? "Pricing…" : "—"}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {quoteError ? <p className="mt-3 text-[13px] text-vo-red">{quoteError}</p> : null}

                <div className="mt-4">
                  {selectedPricing && selectedQuote ? (
                    <DynamicPriceCard
                      pricing={selectedPricing}
                      total={selectedQuote.total}
                      tone="light"
                    />
                  ) : (
                    <div className="rounded-xl border border-driver-line bg-[#f6f7f4] p-3.5 text-[12px] text-driver-muted">
                      {quoteLoading ? "Loading live tariff…" : "Live tariff unavailable."}
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-driver-muted">
                    Peak vs Off-Peak
                  </h2>
                  <div className="mt-2">
                    {peakQuote && offPeakQuote ? (
                      <PeakOffPeakCompare
                        peakTariff={peakQuote.tariff_per_kwh}
                        offPeakTariff={offPeakQuote.tariff_per_kwh}
                        peakTotal={peakTotal}
                        offPeakTotal={offPeakTotal}
                        savingsTotal={savingsTotal}
                        savingsPct={savingsPct}
                        cheaper={cheaper}
                        tone="light"
                      />
                    ) : (
                      <p className="text-[13px] text-driver-muted">
                        {quoteLoading ? "Comparing windows…" : "Peak / Off-Peak comparison needs live pricing."}
                      </p>
                    )}
                  </div>
                </div>

                {cheaper === "off-peak" && savingsTotal != null && savingsTotal > 0 ? (
                  <div className="mt-4 rounded-[18px] border border-emerald-200 bg-driver-mint px-4 py-3">
                    <p className="text-[13px] font-semibold text-[#0b7a52]">Best time to charge</p>
                    <p className="mt-1 text-[13px] text-[#0b7a52]">
                      Off-Peak · estimated saving {formatInr(savingsTotal)}
                      {savingsPct != null ? ` (${savingsPct}%)` : ""} vs Peak
                    </p>
                  </div>
                ) : null}

                <dl className="mt-5">
                  <div className="flex items-center justify-between border-b border-driver-line py-3 text-[13px]">
                    <dt className="text-driver-muted">Station</dt>
                    <dd className="font-semibold">{charger.name.replace(" (demo)", "")}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-driver-line py-3 text-[13px]">
                    <dt className="text-driver-muted">Energy required</dt>
                    <dd className="font-semibold">{energyKwh != null ? formatKwh(energyKwh) : "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-driver-line py-3 text-[13px]">
                    <dt className="text-driver-muted">Charging time</dt>
                    <dd className="font-semibold">{chargeMinutes != null ? `${chargeMinutes} min` : "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-driver-line py-3 text-[13px]">
                    <dt className="text-driver-muted">Window</dt>
                    <dd className="font-semibold">
                      {selectedPricing
                        ? selectedPricing.is_off_peak
                          ? "Off-Peak"
                          : selectedPricing.is_peak
                            ? "Peak"
                            : "Standard"
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-driver-line py-3 text-[13px]">
                    <dt className="text-driver-muted">Price / kWh</dt>
                    <dd className="font-semibold">
                      {selectedPricing ? `${formatInr(selectedPricing.price)} / kWh` : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-driver-line py-3 text-[13px]">
                    <dt className="text-driver-muted">Estimated total</dt>
                    <dd className="font-semibold">{selectedTotal != null ? formatInr(selectedTotal) : "—"}</dd>
                  </div>
                </dl>

                {submitError ? <p className="mt-3 text-[13px] text-vo-red">{submitError}</p> : null}

                <button
                  type="button"
                  disabled={!selectedQuote}
                  onClick={() => setBookingStep("payment")}
                  className="fixed bottom-5 left-1/2 flex h-12 w-[min(382px,calc(100%-40px))] -translate-x-1/2 items-center justify-center rounded-2xl bg-vo-accent text-[14px] font-semibold text-[#06231b] disabled:opacity-60 shadow-lg hover:brightness-105 transition-all"
                >
                  {proceedButtonLabel}
                </button>
              </>
            ) : (
              /* --- Step 2: MVP Payment Simulation Placeholder --- */
              <>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-emerald-800 uppercase">
                    MVP Payment Simulation
                  </span>
                  <span className="text-[12px] font-mono text-driver-muted">Step 2 of 2</span>
                </div>
                <h1 className="mt-2 text-[28px] leading-tight font-semibold">Confirm Payment</h1>
                <p className="mt-1 text-[13px] text-driver-muted">
                  Review your session total and choose a payment method to complete your booking.
                </p>

                {/* Booking Order Summary */}
                <div className="mt-4 rounded-2xl border border-driver-line bg-[#f6f7f4] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-driver-muted uppercase tracking-wider">Station</span>
                    <span className="text-[14px] font-bold text-slate-900">{charger.name.replace(" (demo)", "")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-driver-muted">Time Slot</span>
                    <span className="text-[13px] font-medium">{formatSlot(selected.slot)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-driver-muted">Energy & Time</span>
                    <span className="text-[13px] font-medium">
                      {energyKwh != null ? formatKwh(energyKwh) : "—"} · {chargeMinutes != null ? `${chargeMinutes} min` : "30 min"}
                    </span>
                  </div>
                  <div className="border-t border-driver-line pt-2 flex items-center justify-between font-semibold">
                    <span className="text-[13px] text-slate-900">Total Amount</span>
                    <span className="text-[18px] text-emerald-600 font-bold">{selectedTotal != null ? formatInr(selectedTotal) : "—"}</span>
                  </div>
                </div>

                {/* Payment Method Selector (Simulation) */}
                <div className="mt-5 space-y-3">
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-driver-muted">
                    Select Payment Method
                  </h2>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${
                        paymentMethod === "upi"
                          ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-400/20"
                          : "border-driver-line bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          <Smartphone size={20} />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-slate-900">UPI / QR Code</p>
                          <p className="text-[12px] text-driver-muted">Google Pay, PhonePe, Paytm, BHIM</p>
                        </div>
                      </div>
                      {paymentMethod === "upi" ? <CheckCircle2 size={20} className="text-emerald-600" /> : null}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${
                        paymentMethod === "card"
                          ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-400/20"
                          : "border-driver-line bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-slate-900">Credit / Debit Card</p>
                          <p className="text-[12px] text-driver-muted">Visa, Mastercard, RuPay</p>
                        </div>
                      </div>
                      {paymentMethod === "card" ? <CheckCircle2 size={20} className="text-emerald-600" /> : null}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("wallet")}
                      className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${
                        paymentMethod === "wallet"
                          ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-400/20"
                          : "border-driver-line bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                          <Wallet size={20} />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-slate-900">Vidyut Wallet</p>
                          <p className="text-[12px] text-driver-muted">Simulated Balance: ₹1,500.00</p>
                        </div>
                      </div>
                      {paymentMethod === "wallet" ? <CheckCircle2 size={20} className="text-emerald-600" /> : null}
                    </button>
                  </div>
                </div>

                {/* MVP Notice */}
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-600">
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>MVP Demo Mode:</strong> Payment gateway is simulated. Clicking pay will process a dummy transaction and immediately confirm your reservation.
                  </p>
                </div>

                {submitError ? <p className="mt-3 text-[13px] text-vo-red">{submitError}</p> : null}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleConfirmPayment()}
                  className="fixed bottom-5 left-1/2 flex h-12 w-[min(382px,calc(100%-40px))] -translate-x-1/2 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[15px] font-bold text-slate-950 disabled:opacity-60 shadow-lg hover:bg-emerald-400 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      Simulating Payment…
                    </span>
                  ) : (
                    payButtonLabel
                  )}
                </button>
              </>
            )}
          </div>
        ) : null}
      </ScreenState>
    </div>
  );
}

