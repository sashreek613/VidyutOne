import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { StatusBar } from "../../components/driver/StatusBar";
import { ScreenState } from "../../components/common/ScreenState";
import { useBooking, useCharger } from "../../hooks/useApiData";
import { formatInr } from "../../utils/format";

export function BookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data: booking, error, loading } = useBooking(bookingId);
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

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StatusBar />
      <ScreenState loading={loading} error={error} tone="light">
        {booking ? (
          <div className="px-5 pt-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-driver-mint text-[22px] text-[#0b7a52]">
              ✓
            </div>
            <h1 className="mt-4 text-[28px] font-semibold">Booking confirmed</h1>
            <p className="mt-1 text-[13px] text-driver-muted">No payment was taken. This is an MVP reservation.</p>

            <dl className="mt-8 divide-y divide-driver-line rounded-[22px] border border-driver-line bg-[#f7f8f5] px-4">
              <Row label="Charger" value={chargerQuery.data?.name.replace(" (demo)", "") ?? booking.charger_id} />
              <Row label="Selected slot" value={slotLabel} />
              <Row label="Price" value={formatInr(booking.price)} />
              <Row label="Booking ID" value={booking.id.slice(0, 8).toUpperCase()} />
              <Row label="Status" value={booking.status} />
            </dl>

            <Link
              to="/driver"
              className="mt-8 flex h-12 items-center justify-center rounded-2xl bg-vo-accent text-[14px] font-semibold text-[#06231b]"
            >
              Back to driver home
            </Link>
          </div>
        ) : null}
      </ScreenState>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 text-[13px]">
      <dt className="text-driver-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
