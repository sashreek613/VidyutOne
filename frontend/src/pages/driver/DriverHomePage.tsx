import { ArrowUpRight, LocateFixed, LogOut, MapPin, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { VehicleWidget } from "../../components/driver/VehicleWidget";
import { VehicleModal } from "../../components/driver/VehicleModal";
import { ChargerCard } from "../../components/driver/ChargerCard";
import { DriverMap } from "../../components/driver/DriverMap";
import { StatusBar } from "../../components/driver/StatusBar";
import { ScreenState } from "../../components/common/ScreenState";
// Reused as-is from the planner side -- generic offline place search
// (GET /api/sites/suggest), nothing planner-specific about it.
import { LocationSearchBox } from "../../components/planner/LocationSearchBox";
import { useChargers, useVehicleRange } from "../../hooks/useApiData";
import { useAuth } from "../../hooks/useAuth";
import { createVehicle, deleteVehicle, getVehicles, refreshNearbyChargers, suggestLocations, updateVehicle } from "../../services/api";
import type { Charger, DrivingProfile, LocationSuggestion, Vehicle, VehicleCreate, VehicleUpdate } from "../../types";
import { sortByRecommendation } from "../../utils/chargerRanking";
import { firstNameFromFullName, greetingForHour, initialsFromName } from "../../utils/format";
import { centroid, haversineKm, isWithinRange } from "../../utils/geo";

interface DriverLocation {
  latitude: number;
  longitude: number;
}

interface SearchedLocation {
  latitude: number;
  longitude: number;
  name: string;
}

// "pending" while the request is in flight; every other value is terminal
// until a "Try again" click resets to "pending". "insecure_context" is
// detected BEFORE ever calling getCurrentPosition -- on a plain-HTTP LAN IP
// (e.g. demoing from a phone against the laptop's IP over venue wifi) the
// browser refuses geolocation outright, and without this check that trap
// would otherwise silently look identical to "denied".
type GeoStatus = "pending" | "granted" | "denied" | "unavailable" | "insecure_context";

const GEO_STATUS_COPY: Record<Exclude<GeoStatus, "granted">, string> = {
  pending: "Detecting your location…",
  denied: "Location permission denied",
  unavailable: "Location unavailable on this device",
  insecure_context: "Location requires HTTPS (or localhost) -- this page isn't served securely",
};

const REFRESH_RADIUS_KM = 10;
const REFRESH_COOLDOWN_MS = 60_000; // OCM expects considerate use -- one manual refresh per minute, client-enforced

export function DriverHomePage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { data: chargers, error, loading } = useChargers();
  const [query, setQuery] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("pending");
  const [refreshedReal, setRefreshedReal] = useState<Charger[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  // Only ever written from an effect or event handler, never read via a
  // fresh Date.now() call during render -- render only does arithmetic on
  // this and lastRefreshAt, which is pure.
  const [nowTick, setNowTick] = useState<number | null>(null);
  // Controlled state for VehicleWidget's climate-control toggle and driving-
  // profile control -- lifted here (not owned by VehicleWidget) so this
  // page's OWN useVehicleRange call below (used for the reachable-chargers
  // filter) uses the exact same adjusted range VehicleWidget displays.
  const [climateControl, setClimateControl] = useState(false);
  const [drivingProfile, setDrivingProfile] = useState<DrivingProfile>("mixed");
  const [showAllReachable, setShowAllReachable] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<SearchedLocation | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const hour = new Date().getHours();

  useEffect(() => {
    if (lastRefreshAt === null) {
      return;
    }
    setNowTick(Date.now());
    const interval = window.setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      if (now - lastRefreshAt >= REFRESH_COOLDOWN_MS) {
        window.clearInterval(interval);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [lastRefreshAt]);

  const primaryVehicle = useMemo(
    () => vehicles.find((v) => v.is_primary) ?? vehicles[0] ?? null,
    [vehicles],
  );

  // A searched location takes priority over real GPS -- searching is an
  // explicit "show me chargers over there instead" action. Clearing the
  // search (see handleClearSearch) drops back to GPS/centroid exactly as
  // before this feature existed.
  const origin = useMemo(
    () => searchedLocation ?? driverLocation ?? centroid(chargers ?? []),
    [searchedLocation, driverLocation, chargers],
  );

  async function handleSelectSearchSuggestion(suggestion: LocationSuggestion) {
    setSearchError(null);
    setSearchedLocation({ latitude: suggestion.latitude, longitude: suggestion.longitude, name: suggestion.name });
  }

  async function handleSubmitSearchFreeText(query: string) {
    setSearchError(null);
    try {
      const matches = await suggestLocations(query, 1);
      const best = matches[0];
      if (!best) {
        setSearchError(`No known location matches "${query}".`);
        return;
      }
      setSearchedLocation({ latitude: best.latitude, longitude: best.longitude, name: best.name });
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Couldn't search for that location.");
    }
  }

  function handleClearSearch() {
    setSearchedLocation(null);
    setSearchError(null);
  }

  // The one authoritative range source (backend/app/services/range_service.py
  // via GET /vehicles/{id}/range) -- recomputes whenever the vehicle, its
  // committed battery %, or any of the three adjustment controls change.
  // Same params VehicleWidget passes to its own call, so the reachable-
  // chargers filter below and what the widget displays never disagree.
  const { data: range } = useVehicleRange(primaryVehicle, {
    lat: origin.latitude,
    lon: origin.longitude,
    climateControl,
    drivingProfile,
  });

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

  // Real driver location via the browser Geolocation API. On denial,
  // unavailability, or any error, driverLocation stays null and origin
  // below falls back to centroid(chargers) -- this must never crash or
  // block the page. geoStatus is what makes that fallback VISIBLE (see the
  // badge in the JSX below) instead of silent.
  function requestLocation() {
    // Secure-context check happens before ever touching the Geolocation
    // API -- on plain HTTP + a non-localhost host, getCurrentPosition would
    // just hang or reject with no useful signal, so this is checked first
    // and explicitly, not inferred from a failed request.
    if (!window.isSecureContext) {
      setGeoStatus("insecure_context");
      return;
    }
    if (!("geolocation" in navigator)) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDriverLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setGeoStatus("granted");
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestLocation is stable in behaviour (reads window/navigator, not props/state) and is also exposed as the "Try again" handler; re-running this effect on every render would re-trigger the browser permission flow.
  }, []);

  const bufferedRangeKm = primaryVehicle ? (range?.buffered_range_km ?? null) : null;
  // true once we actually have a range figure to filter by -- not merely
  // "a vehicle is selected", so the list doesn't flash-filter-to-empty
  // before the first range fetch resolves.
  const isRangeLimited = primaryVehicle !== null && bufferedRangeKm !== null;

  // Merges in whatever POST /api/chargers/refresh last returned, by id --
  // reflects a manual refresh immediately without needing to touch the
  // shared useChargers() hook (out of scope for this task).
  const effectiveChargers = useMemo(() => {
    const base = chargers ?? [];
    if (refreshedReal.length === 0) {
      return base;
    }
    const byId = new Map(base.map((c) => [c.id, c] as const));
    for (const charger of refreshedReal) {
      byId.set(charger.id, charger);
    }
    return Array.from(byId.values());
  }, [chargers, refreshedReal]);

  const allRanked = useMemo(() => {
    const list = effectiveChargers;
    return list
      .map((charger) => {
        // REAL chargers all share site_id: null -- grouping by site_id
        // would otherwise lump every one of them into one giant "site".
        // Only DEMO chargers (real, non-null site_id) get grouped; a REAL
        // charger is always its own group of one.
        const siteMates = charger.site_id !== null ? list.filter((item) => item.site_id === charger.site_id) : [charger];
        return {
          charger,
          km: haversineKm(origin.latitude, origin.longitude, charger.latitude, charger.longitude),
          freeCount: siteMates.filter((item) => item.availability === true).length,
          totalCount: siteMates.length,
        };
      })
      .filter((row) => row.charger.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.km - b.km);
  }, [effectiveChargers, origin, query]);

  // No vehicle (or its range hasn't loaded yet) -- keep today's behaviour:
  // everything, sorted by distance. Vehicle + range known -- filter to
  // what's actually reachable. Recomputes automatically whenever
  // bufferedRangeKm changes (battery %, vehicle swap, spec edit) or the
  // driver's location changes -- no page refresh needed.
  const ranked = useMemo(() => {
    if (!isRangeLimited) {
      return allRanked;
    }
    return allRanked.filter((row) => isWithinRange(origin, row.charger, bufferedRangeKm!));
  }, [allRanked, isRangeLimited, bufferedRangeKm, origin]);

  // When range-limited, anchor the distance score to the driver's actual
  // range (a charger at the edge of range scores ~0 on distance, one right
  // beside the driver scores ~100). Without a vehicle there's no range to
  // anchor to -- fall back to the farthest charger actually in the
  // (unfiltered) list so the score still spans a meaningful 0-100.
  const maxRelevantKm = isRangeLimited ? bufferedRangeKm! : Math.max(1, ...ranked.map((row) => row.km));

  const recommended = useMemo(
    () => sortByRecommendation(ranked, maxRelevantKm).slice(0, 5),
    [ranked, maxRelevantKm],
  );

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

  const refreshCooldownRemainingMs =
    lastRefreshAt === null || nowTick === null ? 0 : Math.max(0, REFRESH_COOLDOWN_MS - (nowTick - lastRefreshAt));

  async function handleRefreshNearby() {
    if (refreshing || refreshCooldownRemainingMs > 0) {
      return;
    }
    setRefreshing(true);
    setRefreshError(null);
    try {
      const fresh = await refreshNearbyChargers(origin.latitude, origin.longitude, REFRESH_RADIUS_KM);
      setRefreshedReal(fresh);
      setLastRefreshAt(Date.now());
    } catch (err: unknown) {
      setRefreshError(err instanceof Error ? err.message : "Couldn't refresh nearby chargers.");
    } finally {
      setRefreshing(false);
    }
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
          location={origin}
          climateControl={climateControl}
          onClimateControlChange={setClimateControl}
          drivingProfile={drivingProfile}
          onDrivingProfileChange={setDrivingProfile}
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

        <Link
          to="/driver/bookings"
          className="block rounded-2xl border border-vo-line bg-vo-card p-4 hover:border-emerald-500/40 transition-colors"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            Reservations
          </p>
          <p className="mt-1 text-[16px] font-bold text-white">My Bookings</p>
          <p className="mt-1 text-[12px] text-vo-muted">View upcoming and past charging reservations</p>
        </Link>

        <label className="flex h-12 items-center gap-3 rounded-2xl border border-vo-line bg-vo-card px-4 shadow-inner">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-400 text-black shrink-0">
            <ArrowUpRight size={14} />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter this list by charger name..."
            className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-vo-muted"
          />
        </label>

        {/* Search a DIFFERENT place -- unlike the filter above, this moves
            `origin` itself, so the map, range circle, and recommendations
            all shift to the searched location instead of your real GPS. */}
        <div>
          <LocationSearchBox
            onSelectSuggestion={(s) => void handleSelectSearchSuggestion(s)}
            onSubmitFreeText={(q) => void handleSubmitSearchFreeText(q)}
            onClear={handleClearSearch}
          />
          {searchError ? <p className="mt-1.5 text-[11px] text-red-400">{searchError}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void handleRefreshNearby()}
            disabled={refreshing || refreshCooldownRemainingMs > 0}
            className="flex items-center gap-1.5 rounded-xl border border-vo-line bg-vo-card px-3 py-1.5 text-[11px] font-medium text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing
              ? "Refreshing…"
              : refreshCooldownRemainingMs > 0
                ? `Refresh available in ${Math.ceil(refreshCooldownRemainingMs / 1000)}s`
                : "Refresh nearby chargers"}
          </button>
          {refreshError ? <p className="text-[11px] text-red-400">{refreshError}</p> : null}
        </div>
      </div>

      <ScreenState loading={loading} error={error} empty={!loading && !error && allRanked.length === 0}>
        <div className="mt-4 px-5 space-y-4">
          <div className="h-[210px] overflow-hidden rounded-2xl border border-vo-line">
            <DriverMap
              chargers={effectiveChargers}
              origin={origin}
              rangeKm={isRangeLimited ? bufferedRangeKm : null}
              isLiveLocation={geoStatus === "granted" && !searchedLocation}
            />
          </div>

          {searchedLocation ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] text-cyan-300">
                <MapPin size={12} />
                <span>Showing chargers near "{searchedLocation.name}"</span>
              </div>
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-200"
              >
                <X size={12} />
                Back to my location
              </button>
            </div>
          ) : geoStatus === "granted" ? (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Using your live location</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400" title={GEO_STATUS_COPY[geoStatus]}>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>
                  {geoStatus === "pending"
                    ? GEO_STATUS_COPY.pending
                    : "Using estimated area -- enable location for accurate results"}
                </span>
              </div>
              {geoStatus === "denied" || geoStatus === "unavailable" ? (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-amber-300 hover:text-amber-200"
                >
                  <LocateFixed size={12} />
                  Try again
                </button>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-white">
              {isRangeLimited ? "Reachable Chargers" : "Nearby Chargers"}
            </h2>
            <span className="text-[12px] text-emerald-400 font-mono">
              {isRangeLimited
                ? `${ranked.length} within your ${Math.round(bufferedRangeKm!)} km range`
                : `${ranked.length} Available`}
            </span>
          </div>

          {isRangeLimited && ranked.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center space-y-1.5">
              <p className="text-sm font-semibold text-amber-400">No chargers within your current range</p>
              <p className="text-xs text-vo-muted">Consider charging soon, or widen your search once your battery's topped up.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pt-1">
                <h3 className="text-[13px] font-bold text-white">Recommended for you</h3>
                <span className="text-[10px] uppercase tracking-wider text-vo-muted">Closer · known status · faster charging</span>
              </div>
              {/* No placeholder rows when fewer than 5 are in range --
                  .slice(0, 5) already just returns what exists. */}
              <div className="flex flex-col gap-3">
                {recommended.map((row, index) => (
                  <ChargerCard
                    key={row.charger.id}
                    charger={row.charger}
                    km={row.km}
                    freeCount={row.freeCount}
                    totalCount={row.totalCount}
                    rank={index + 1}
                  />
                ))}
              </div>

              {ranked.length > recommended.length ? (
                <button
                  type="button"
                  onClick={() => setShowAllReachable((v) => !v)}
                  className="text-[12px] font-medium text-emerald-400 hover:text-emerald-300"
                >
                  {showAllReachable ? "Hide full list" : `Show all ${ranked.length} reachable`}
                </button>
              ) : null}

              {/* Never permanently hidden -- this is the escape hatch, the
                  rest of the reachable set is always one click away. */}
              {showAllReachable && ranked.length > recommended.length ? (
                <div className="flex flex-col gap-3 border-t border-vo-line/40 pt-3">
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
              ) : null}
            </>
          )}
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
