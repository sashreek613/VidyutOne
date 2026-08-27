import { ArrowUpRight, LocateFixed, LogOut, MapPin, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { VehicleWidget } from "../../components/driver/VehicleWidget";
import { VehicleModal } from "../../components/driver/VehicleModal";
import { ChargerCard } from "../../components/driver/ChargerCard";
import { DriverMap } from "../../components/driver/DriverMap";
import { StatusBar } from "../../components/driver/StatusBar";
import { VoiceAssistantButton } from "../../components/driver/VoiceAssistantButton";
import { ScreenState } from "../../components/common/ScreenState";
import { ThemeToggle } from "../../components/common/ThemeToggle";
// Reused as-is from the planner side -- generic offline place search
// (GET /api/sites/suggest), nothing planner-specific about it.
import { LocationSearchBox } from "../../components/planner/LocationSearchBox";
import { useChargers, useVehicleRange } from "../../hooks/useApiData";
import { useAuth } from "../../hooks/useAuth";
import { createVehicle, deleteVehicle, getChargers, getVehicles, suggestLocations, updateVehicle } from "../../services/api";
import type { Charger, DrivingProfile, LocationSuggestion, Vehicle, VehicleCreate, VehicleUpdate } from "../../types";
import {
  applyChargerFilters,
  DEFAULT_CHARGER_FILTERS,
  uniqueConnectors,
  type ChargerFilterState,
} from "../../utils/chargerFilters";
import { sortByRecommendation } from "../../utils/chargerRanking";
import { firstNameFromFullName, greetingForHour, initialsFromName } from "../../utils/format";
import { centroid, haversineKm, isWithinRange } from "../../utils/geo";
import { loadDriverDiscoveryState, saveDriverDiscoveryState } from "../../utils/driverDiscoveryState";

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

const REFRESH_COOLDOWN_MS = 60_000;

export function DriverHomePage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { data: chargers, error, loading } = useChargers();
  const [query, setQuery] = useState(() => loadDriverDiscoveryState()?.query ?? "");
  const [filters, setFilters] = useState<ChargerFilterState>(() => loadDriverDiscoveryState()?.filters ?? DEFAULT_CHARGER_FILTERS);
  const [selectedChargerId, setSelectedChargerId] = useState<string | null>(null);
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
  const [showAllReachable, setShowAllReachable] = useState(() => loadDriverDiscoveryState()?.showAllReachable ?? false);
  const [searchedLocation, setSearchedLocation] = useState<SearchedLocation | null>(() => loadDriverDiscoveryState()?.searchedLocation ?? null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchBoxKey, setSearchBoxKey] = useState(0);
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
    setSelectedChargerId(null);
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
      setSelectedChargerId(null);
      setSearchedLocation({ latitude: best.latitude, longitude: best.longitude, name: best.name });
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Couldn't search for that location.");
    }
  }

  function handleClearSearch() {
    setSelectedChargerId(null);
    setSearchedLocation(null);
    setSearchError(null);
    setSearchBoxKey((key) => key + 1);
  }

  function handleMapPickLocation(lat: number, lon: number) {
    setSearchError(null);
    setSelectedChargerId(null);
    setSearchedLocation({
      latitude: lat,
      longitude: lon,
      name: "Selected map location",
    });
    setSearchBoxKey((key) => key + 1);
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

  // Manual refresh replaces the cached GET /api/chargers payload in-place
  // (safe data source). It does not call live OpenChargeMap.
  const effectiveChargers = useMemo(() => {
    if (refreshedReal.length > 0) {
      return refreshedReal;
    }
    return chargers ?? [];
  }, [chargers, refreshedReal]);

  const connectorOptions = useMemo(() => uniqueConnectors(effectiveChargers), [effectiveChargers]);

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
  const reachable = useMemo(() => {
    if (!isRangeLimited) {
      return allRanked;
    }
    return allRanked.filter((row) => isWithinRange(origin, row.charger, bufferedRangeKm!));
  }, [allRanked, isRangeLimited, bufferedRangeKm, origin]);

  const ranked = useMemo(() => applyChargerFilters(reachable, filters), [reachable, filters]);

  useEffect(() => {
    if (selectedChargerId && !ranked.some((row) => row.charger.id === selectedChargerId)) {
      setSelectedChargerId(null);
    }
  }, [ranked, selectedChargerId]);

  useEffect(() => {
    if (!selectedChargerId) {
      return;
    }
    const el = document.getElementById(`charger-card-${selectedChargerId}`);
    if (!el) {
      setShowAllReachable(true);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedChargerId, showAllReachable]);

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

  const visibleRecommended = useMemo(() => {
    if (!selectedChargerId || recommended.some((row) => row.charger.id === selectedChargerId)) {
      return recommended;
    }
    const extra = ranked.find((row) => row.charger.id === selectedChargerId);
    return extra ? [...recommended, extra] : recommended;
  }, [recommended, ranked, selectedChargerId]);

  const mapChargers = useMemo(() => ranked.map((row) => row.charger), [ranked]);

  useEffect(() => {
    saveDriverDiscoveryState({
      query,
      filters,
      searchedLocation,
      showAllReachable,
    });
  }, [query, filters, searchedLocation, showAllReachable]);

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
      const fresh = await getChargers();
      setRefreshedReal(fresh);
      setLastRefreshAt(Date.now());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Couldn't refresh nearby chargers.";
      setRefreshError(msg);
    } finally {
      setRefreshing(false);
    }

  }

  return (
    <div className="flex min-h-screen flex-col bg-driver-bg text-driver-ink pb-8">
      <StatusBar />
      <div className="px-5 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-vo-accent-ink">EV Driver Portal</p>
            <h1 className="text-[26px] font-bold tracking-tight">
              {greetingForHour(hour)}, {firstNameFromFullName(profile?.full_name ?? "there")}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle compact />
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-vo-good-bg border border-vo-good-border text-[13px] font-bold text-vo-accent-ink">
              {initialsFromName(profile?.full_name ?? "Driver")}
            </span>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => navigate("/", { replace: true }));
              }}
              className="p-2 rounded-xl bg-driver-card hover:bg-driver-line text-driver-muted hover:text-driver-ink transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <VoiceAssistantButton
          onSearchLocation={(q) => void handleSubmitSearchFreeText(q)}
          onClearSearch={handleClearSearch}
          onSetSort={(sort) => setFilters((current) => ({ ...current, sort }))}
          bufferedRangeKm={bufferedRangeKm}
          recommended={recommended}
        />

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
          <p className="text-[10px] font-semibold uppercase tracking-wider text-vo-accent-ink">
            Charging cost & savings
          </p>
          <p className="mt-1 text-[16px] font-bold text-driver-ink">See live tariffs, history, and off-peak savings</p>
          <p className="mt-1 text-[12px] text-vo-muted">Powered by the existing pricing engine · your bookings only</p>
        </Link>

        <Link
          to="/driver/bookings"
          className="block rounded-2xl border border-vo-line bg-vo-card p-4 hover:border-emerald-500/40 transition-colors"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-vo-accent-ink">
            Reservations
          </p>
          <p className="mt-1 text-[16px] font-bold text-driver-ink">My Bookings</p>
          <p className="mt-1 text-[12px] text-vo-muted">View upcoming and past charging reservations</p>
        </Link>

        {/* Name filter only -- location search sits on the map so choosing a
            place updates origin, distances, and markers rather than this list. */}
        <label className="flex h-12 items-center gap-3 rounded-2xl border border-vo-line bg-vo-card px-4 shadow-inner">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-400 text-black shrink-0">
            <ArrowUpRight size={14} />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter this list by charger name..."
            className="w-full bg-transparent text-[14px] text-driver-ink outline-none placeholder:text-vo-muted"
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void handleRefreshNearby()}
            disabled={refreshing || refreshCooldownRemainingMs > 0}
            className="flex items-center gap-1.5 rounded-xl border border-vo-line bg-vo-card px-3 py-1.5 text-[11px] font-medium text-vo-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing
              ? "Refreshing…"
              : refreshCooldownRemainingMs > 0
                ? `Refresh available in ${Math.ceil(refreshCooldownRemainingMs / 1000)}s`
                : "Refresh nearby chargers"}
          </button>
          {refreshError ? <p className="text-[11px] text-vo-bad-ink">{refreshError}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-vo-muted">Sort</span>
            <select
              value={filters.sort}
              onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as ChargerFilterState["sort"] }))}
              className="w-full rounded-xl border border-vo-line bg-vo-card px-2.5 py-2 text-[11px] text-driver-ink"
            >
              <option value="nearest">Nearest first</option>
              <option value="cheapest">Cheapest first</option>
              <option value="fastest">Fastest charging</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-vo-muted">Booking</span>
            <select
              value={filters.bookable}
              onChange={(event) => setFilters((current) => ({ ...current, bookable: event.target.value as ChargerFilterState["bookable"] }))}
              className="w-full rounded-xl border border-vo-line bg-vo-card px-2.5 py-2 text-[11px] text-driver-ink"
            >
              <option value="all">All chargers</option>
              <option value="bookable">Bookable</option>
              <option value="info">Info only</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-vo-muted">Status</span>
            <select
              value={filters.availability}
              onChange={(event) => setFilters((current) => ({ ...current, availability: event.target.value as ChargerFilterState["availability"] }))}
              className="w-full rounded-xl border border-vo-line bg-vo-card px-2.5 py-2 text-[11px] text-driver-ink"
            >
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-vo-muted">Connector</span>
            <select
              value={filters.connector}
              onChange={(event) => setFilters((current) => ({ ...current, connector: event.target.value }))}
              className="w-full rounded-xl border border-vo-line bg-vo-card px-2.5 py-2 text-[11px] text-driver-ink"
            >
              <option value="all">All connectors</option>
              {connectorOptions.map((connector) => (
                <option key={connector} value={connector}>
                  {connector}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-vo-muted">Max price (₹/kWh)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={filters.maxPrice ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                setFilters((current) => ({
                  ...current,
                  maxPrice: raw === "" || !Number.isFinite(Number(raw)) ? null : Number(raw),
                }));
              }}
              placeholder="Known prices only — unknown prices stay hidden"
              className="w-full rounded-xl border border-vo-line bg-vo-card px-2.5 py-2 text-[11px] text-driver-ink placeholder:text-vo-muted"
            />
          </label>
        </div>
      </div>

      <ScreenState loading={loading} error={error} empty={!loading && !error && allRanked.length === 0}>
        <div className="mt-4 px-5 space-y-4">
          <div className="relative z-20 space-y-2">
            <LocationSearchBox
              key={searchBoxKey}
              initialQuery={searchedLocation?.name ?? ""}
              placeholder="Search a location or click the map..."
              onSelectSuggestion={(s) => void handleSelectSearchSuggestion(s)}
              onSubmitFreeText={(q) => void handleSubmitSearchFreeText(q)}
              onClear={handleClearSearch}
            />
            {searchError ? (
              <p className="rounded-lg border border-vo-bad-border bg-vo-bad-bg px-2 py-1 text-[11px] text-vo-bad-ink">
                {searchError}
              </p>
            ) : null}
          </div>

          <div className="h-[280px] overflow-hidden rounded-2xl border border-vo-line">
            <DriverMap
              chargers={mapChargers}
              origin={origin}
              rangeKm={isRangeLimited ? bufferedRangeKm : null}
              isLiveLocation={geoStatus === "granted" && !searchedLocation}
              selectedChargerId={selectedChargerId}
              onSelectCharger={setSelectedChargerId}
              onMapClick={handleMapPickLocation}
            />
          </div>

          {searchedLocation ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] text-vo-info-ink">
                <MapPin size={12} />
                <span>Showing chargers near "{searchedLocation.name}"</span>
              </div>
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-vo-info-ink hover:opacity-80"
              >
                <X size={12} />
                Back to my location
              </button>
            </div>
          ) : geoStatus === "granted" ? (
            <div className="flex items-center gap-1.5 text-[11px] text-vo-accent-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-vo-accent-ink" />
              <span>Using your live location</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] text-vo-warn-ink" title={GEO_STATUS_COPY[geoStatus]}>
                <span className="h-1.5 w-1.5 rounded-full bg-vo-warn-ink" />
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
                  className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-vo-warn-ink hover:opacity-80"
                >
                  <LocateFixed size={12} />
                  Try again
                </button>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-driver-ink">
              {isRangeLimited ? "Reachable Chargers" : "Nearby Chargers"}
            </h2>
            <span className="text-[12px] text-vo-accent-ink font-mono">
              {isRangeLimited
                ? `${ranked.length} within your ${Math.round(bufferedRangeKm!)} km range`
                : `${ranked.length} Available`}
            </span>
          </div>

          {isRangeLimited && ranked.length === 0 && reachable.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center space-y-1.5">
              <p className="text-sm font-semibold text-vo-warn-ink">No chargers within your current range</p>
              <p className="text-xs text-vo-muted">Consider charging soon, or widen your search once your battery's topped up.</p>
            </div>
          ) : ranked.length === 0 ? (
            <div className="rounded-2xl border border-vo-line bg-vo-card p-6 text-center space-y-1.5">
              <p className="text-sm font-semibold text-driver-ink">No chargers match these filters</p>
              <p className="text-xs text-vo-muted">Try clearing a filter or searching a different location.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pt-1">
                <h3 className="text-[13px] font-bold text-driver-ink">Recommended for you</h3>
                <span className="text-[10px] uppercase tracking-wider text-vo-muted">Closer · known status · faster charging</span>
              </div>
              {/* No placeholder rows when fewer than 5 are in range --
                  .slice(0, 5) already just returns what exists. */}
              <div className="flex flex-col gap-3">
                {visibleRecommended.map((row, index) => (
                  <ChargerCard
                    key={row.charger.id}
                    charger={row.charger}
                    km={row.km}
                    freeCount={row.freeCount}
                    totalCount={row.totalCount}
                    rank={index + 1}
                    origin={origin}
                    selected={selectedChargerId === row.charger.id}
                    onSelect={setSelectedChargerId}
                  />
                ))}
              </div>

              {ranked.length > recommended.length ? (
                <button
                  type="button"
                  onClick={() => setShowAllReachable((v) => !v)}
                  className="text-[12px] font-medium text-vo-accent-ink hover:opacity-80"
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
                      origin={origin}
                      selected={selectedChargerId === row.charger.id}
                      onSelect={setSelectedChargerId}
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
