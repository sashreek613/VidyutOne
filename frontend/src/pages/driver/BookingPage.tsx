import { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Info, X } from "lucide-react";

import { StatusBar } from "../../components/driver/StatusBar";
import { ScreenState } from "../../components/common/ScreenState";
import { useBooking, useCharger } from "../../hooks/useApiData";
import { cancelBooking } from "../../services/api";
import { formatInr } from "../../utils/format";
import type { Booking } from "../../types";

export function BookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data: initialBooking, error, loading } = useBooking(bookingId);
  const [booking, setBooking] = useState<Booking | null>(null);

  const [cancelling, setCancelling] = useState(false);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialBooking) {
      setBooking(initialBooking);
    }
  }, [initialBooking]);

  const chargerQuery = useCharger(booking?.charger_id);

  const slotLabel = useMemo(() => {
    if (!booking) {
      return "";
    }
    return new Date(booking.slot_time).toLocaleString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  }, [booking]);

  const statusLabel = useMemo(() => {
    if (!booking) return "";
    switch (booking.status) {
      case "BOOKED":
        return "Confirmed";
      case "ACTIVE":
        return "Active";
      case "COMPLETED":
        return "Completed";
      case "CANCELLED":
        return "Cancelled";
      default:
        return booking.status;
    }
  }, [booking]);

  const titleText = useMemo(() => {
    if (!booking) return "";
    switch (booking.status) {
      case "BOOKED":
        return "Booking confirmed";
      case "ACTIVE":
        return "Booking active";
      case "COMPLETED":
        return "Booking completed";
      case "CANCELLED":
        return "Booking cancelled";
      default:
        return "Booking detail";
    }
  }, [booking]);

  const isCancellable = useMemo(() => {
    return booking?.status === "BOOKED" && new Date() < new Date(booking.slot_time);
  }, [booking]);

  async function handleCancelConfirm() {
    if (!bookingId) return;
    setSubmittingCancel(true);
    setActionError(null);
    try {
      const updated = await cancelBooking(bookingId);
      setBooking(updated);
      setSuccessMessage("Booking cancelled successfully.");
      setCancelling(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel booking.");
    } finally {
      setSubmittingCancel(false);
    }
  }

  const stationName = chargerQuery.data?.name.replace(" (demo)", "") ?? booking?.charger_id ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StatusBar />
      <ScreenState loading={loading} error={error} tone="light">
        {booking ? (
          <div className="px-5 pt-8 pb-10">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full text-[22px] font-bold ${
              booking.status === "CANCELLED"
                ? "bg-red-50 text-red-600 border border-red-200/50"
                : "bg-driver-mint text-[#0b7a52]"
            }`}>
              {booking.status === "CANCELLED" ? "✕" : "✓"}
            </div>
            <h1 className="mt-4 text-[28px] font-semibold text-driver-ink">{titleText}</h1>
            
            {booking.status === "BOOKED" && (
              <p className="mt-1 text-[13px] text-driver-muted">No payment was taken. This is an MVP reservation.</p>
            )}
            {booking.status === "CANCELLED" && (
              <p className="mt-1 text-[13px] text-red-600 font-medium">This reservation was cancelled and released.</p>
            )}

            {successMessage && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200/50 p-3 text-[13px] text-[#0b7a52] font-medium shadow-sm">
                <Info size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            <dl className="mt-8 divide-y divide-driver-line rounded-[22px] border border-driver-line bg-[#f7f8f5] px-4">
              <Row label="Charger" value={stationName} />
              <Row label="Selected slot" value={slotLabel} />
              <Row label="Price" value={formatInr(booking.price)} />
              <Row label="Booking ID" value={booking.id.slice(0, 8).toUpperCase()} />
              <Row label="Status" value={statusLabel} />
              {booking.duration_minutes ? (
                <Row label="Duration" value={`${booking.duration_minutes} minutes`} />
              ) : null}
            </dl>

            {isCancellable && (
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setCancelling(true);
                }}
                className="mt-8 flex h-12 w-full items-center justify-center rounded-2xl bg-red-50 hover:bg-red-100 text-[14px] font-bold text-red-600 border border-red-200/50 transition-colors"
              >
                Cancel Booking
              </button>
            )}

            <Link
              to="/driver"
              className={`flex h-12 items-center justify-center rounded-2xl bg-vo-accent text-[14px] font-semibold text-[#06231b] ${
                isCancellable ? "mt-4" : "mt-8"
              }`}
            >
              Back to driver home
            </Link>
          </div>
        ) : null}
      </ScreenState>

      {/* Cancellation Modal Dialog */}
      {cancelling && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative border border-driver-line text-driver-ink">
            <button
              type="button"
              onClick={() => setCancelling(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-driver-muted hover:bg-gray-100 hover:text-driver-ink transition-colors"
              disabled={submittingCancel}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div>
                <h2 className="text-[18px] font-bold tracking-tight">Cancel this booking?</h2>
                <p className="mt-1 text-[13px] text-driver-muted">
                  This action cannot be undone. Your reservation slot will be released.
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="rounded-xl bg-[#f7f8f5] border border-driver-line p-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-driver-muted">
                  Reservation Detail
                </p>
                <div className="text-[13px] space-y-1">
                  <p className="font-bold">{stationName}</p>
                  <p className="text-driver-muted">{slotLabel}</p>
                  <p className="font-semibold text-[#0b7a52]">
                    Price: {formatInr(booking.price)}
                  </p>
                </div>
              </div>

              {actionError && (
                <p className="text-[12px] font-medium text-red-600">{actionError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelling(false)}
                  className="flex-1 flex h-11 items-center justify-center rounded-xl border border-driver-line text-[13px] font-bold hover:bg-gray-50 transition-colors"
                  disabled={submittingCancel}
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  onClick={() => void handleCancelConfirm()}
                  className="flex-1 flex h-11 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-[13px] font-bold text-white transition-colors"
                  disabled={submittingCancel}
                >
                  {submittingCancel ? "Cancelling…" : "Cancel Booking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 text-[13px]">
      <dt className="text-driver-muted">{label}</dt>
      <dd className="font-semibold text-driver-ink">{value}</dd>
    </div>
  );
}
