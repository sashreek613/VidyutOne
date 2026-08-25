import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

import { ScreenState } from "../../components/common/ScreenState";
import { FeederChart } from "../../components/planner/FeederChart";
import { LocationSearchBox } from "../../components/planner/LocationSearchBox";
import { LocationVerdictPanel } from "../../components/planner/LocationVerdictPanel";
import { SiteMap, type MapFocus, type MapPoint } from "../../components/planner/SiteMap";
import { TopBar } from "../../components/planner/TopBar";
import { TopRecommendedSites } from "../../components/planner/TopRecommendedSites";
import { useChargers, useClassify, useRecommendedSites, useSites } from "../../hooks/useApiData";
import type { LocationSuggestion, Site } from "../../types";

interface ActivePoint {
  latitude: number;
  longitude: number;
  name: string;
}

export function PlannerDashboardPage() {
  const { data: sites, error, loading } = useSites();
  const { data: existingChargers } = useChargers();
  const { data: recommendedSites } = useRecommendedSites(10);

  const navigate = useNavigate();
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  // Set synchronously the instant we know coordinates (map click,
  // suggestion select). A free-text search doesn't know its coordinates
  // until the classify response resolves the name -- classify.result is
  // authoritative once it lands, so activePoint below derives from
  // whichever is available rather than copying result into a parallel
  // state via an effect.
  const [pendingPoint, setPendingPoint] = useState<ActivePoint | null>(null);
  const classify = useClassify();

  const activePoint: ActivePoint | null = classify.result
    ? { latitude: classify.result.latitude, longitude: classify.result.longitude, name: classify.result.name }
    : pendingPoint;

  const kpis = useMemo(() => {
    const list = sites ?? [];
    const total = list.length;
    const build = list.filter((s) => s.recommendation === "BUILD").length;
    const managed = list.filter((s) => s.recommendation === "BUILD_IF_MANAGED").length;
    const dont = list.filter((s) => s.recommendation === "DONT_BUILD").length;
    return { total, build, managed, dont };
  }, [sites]);

  const selectedSite = useMemo(() => {
    return (sites ?? []).find((s) => s.id === selectedSiteId) ?? null;
  }, [sites, selectedSiteId]);

  // Deliberately keyed on lat/lon (primitives), not the activePoint object
  // itself -- activePoint is a fresh object every render (it's derived, not
  // stored), so memoizing on its identity would never actually memoize.
  // Keying on primitives is what gives SiteMap's focus effect a stable
  // reference to avoid re-flying on unrelated re-renders.
  const focus = useMemo<MapFocus | null>(
    () => (activePoint ? { latitude: activePoint.latitude, longitude: activePoint.longitude, zoom: 15 } : null),
    [activePoint?.latitude, activePoint?.longitude],
  );

  const highlight = useMemo<MapPoint | null>(
    () =>
      activePoint
        ? {
            id: "classify-highlight",
            name: activePoint.name || `${activePoint.latitude.toFixed(4)}, ${activePoint.longitude.toFixed(4)}`,
            latitude: activePoint.latitude,
            longitude: activePoint.longitude,
            recommendation: classify.result?.recommendation,
          }
        : null,
    [activePoint?.latitude, activePoint?.longitude, activePoint?.name, classify.result?.recommendation],
  );

  function handleMapClick(lat: number, lon: number) {
    setPendingPoint({ latitude: lat, longitude: lon, name: "" });
    classify.classifyPoint(lat, lon);
  }

  function handleSelectSuggestion(suggestion: LocationSuggestion) {
    setPendingPoint({ latitude: suggestion.latitude, longitude: suggestion.longitude, name: suggestion.name });
    classify.classifyPoint(suggestion.latitude, suggestion.longitude);
  }

  function handleSubmitFreeText(query: string) {
    // Coordinates aren't known yet -- activePoint stays whatever it was
    // (or null) until classify.result resolves the name, then it's used
    // automatically (see the derivation above).
    setPendingPoint(null);
    classify.classifyName(query);
  }

  function handleClearSearch() {
    setPendingPoint(null);
    classify.clear();
  }

  return (
    <div className="min-h-screen pb-12 bg-vo-bg text-vo-text">
      <TopBar title="Overview" />
      <ScreenState loading={loading} error={error} empty={!loading && !error && (sites?.length ?? 0) === 0}>
        {sites ? (
          <div className="space-y-6 px-6 py-6 max-w-7xl mx-auto">
            {/* Top 4 Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-vo-line bg-vo-card p-5 space-y-1 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-vo-muted">Candidate Sites</p>
                <div className="text-2xl font-bold text-white font-mono">{kpis.total}</div>
                <p className="text-xs text-vo-muted">locations assessed in Bengaluru</p>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-1 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Recommended</p>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">{kpis.build}</div>
                <p className="text-xs text-emerald-300/80">locations recommended to build</p>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-1 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Needs Attention</p>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 font-mono">{kpis.managed}</div>
                <p className="text-xs text-amber-300/80">locations need grid/load management</p>
              </div>

              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 space-y-1 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Not Recommended</p>
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-red-400 font-mono">{kpis.dont}</div>
                <p className="text-xs text-red-300/80">locations currently unsuitable</p>
              </div>
            </div>

            {/* Map hero: search-and-click site assessment, verdict panel alongside */}
            <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr] lg:items-stretch">
              <div className="relative h-[560px] overflow-hidden rounded-2xl border border-vo-line shadow-lg">
                <SiteMap
                  legend={false}
                  chargers={existingChargers ?? []}
                  points={sites.map((site) => ({
                    id: site.id,
                    name: site.name,
                    latitude: site.latitude,
                    longitude: site.longitude,
                    recommendation: site.recommendation,
                  }))}
                  onPointClick={(id) => setSelectedSiteId(id)}
                  onMapClick={handleMapClick}
                  focus={focus}
                  highlight={highlight}
                  classifiedResult={classify.result}
                  selectedSite={selectedSite}
                />


                <LocationSearchBox
                  className="absolute left-4 top-4 z-10"
                  onSelectSuggestion={handleSelectSuggestion}
                  onSubmitFreeText={handleSubmitFreeText}
                  onClear={handleClearSearch}
                />

                {/* Decision overlay card when an existing candidate marker is
                    selected -- unchanged behaviour from before the map-first
                    redesign, coexists with the new search/click assessment. */}
                {selectedSite ? (
                  <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 rounded-2xl border border-vo-line bg-[#0d131f]/95 backdrop-blur p-4 space-y-3 shadow-2xl z-20">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{selectedSite.name.replace(" (demo)", "")}</h4>
                      <button
                        type="button"
                        onClick={() => setSelectedSiteId(null)}
                        className="text-xs text-vo-muted hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono uppercase border"
                      style={{
                        backgroundColor: selectedSite.recommendation === "BUILD" ? "#00e8a215" : selectedSite.recommendation === "BUILD_IF_MANAGED" ? "#f0b42915" : "#ef5b5b15",
                        borderColor: selectedSite.recommendation === "BUILD" ? "#00e8a240" : selectedSite.recommendation === "BUILD_IF_MANAGED" ? "#f0b42940" : "#ef5b5b40",
                        color: selectedSite.recommendation === "BUILD" ? "#00e8a2" : selectedSite.recommendation === "BUILD_IF_MANAGED" ? "#f0b429" : "#ef5b5b",
                      }}
                    >
                      <span>{selectedSite.recommendation.replace(/_/g, " ")}</span>
                    </div>

                    <div className="text-xs space-y-1 text-vo-muted">
                      <p className="font-semibold text-gray-300">Why?</p>
                      {selectedSite.explanation ? (
                        <p className="text-gray-300 leading-relaxed">{selectedSite.explanation}</p>
                      ) : (
                        <>
                          <p className="flex items-center space-x-1 text-gray-300">
                            <span>✓</span>
                            <span>Expected EV Demand: {selectedSite.demand_score >= 70 ? "Strong" : "Moderate"} ({Math.round(selectedSite.demand_score)}/100)</span>
                          </p>
                          <p className="flex items-center space-x-1 text-gray-300">
                            <span>✓</span>
                            <span>Grid Capacity: {selectedSite.grid_capacity_score >= 70 ? "Sufficient" : selectedSite.grid_capacity_score >= 40 ? "Requires load management" : "Constrained"}</span>
                          </p>
                        </>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-vo-line/60">
                      <span className="text-xs font-medium text-vo-accent">
                        Recommended Chargers: {getRecommendedChargerCount(selectedSite)}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/planner/site/${selectedSite.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-vo-accent text-black font-semibold text-xs flex items-center space-x-1 hover:bg-emerald-300 transition-colors"
                      >
                        <span>View site details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="h-[560px]">
                <LocationVerdictPanel
                  status={classify.status}
                  result={classify.result}
                  errorMessage={classify.errorMessage}
                  legend={{ build: kpis.build, managed: kpis.managed, dont: kpis.dont }}
                  onClear={handleClearSearch}
                />
              </div>
            </div>

            {recommendedSites && recommendedSites.length > 0 ? <TopRecommendedSites sites={recommendedSites} /> : null}

            {/* Grid Capacity Section with Expandable Technical Details */}
            <div className="rounded-2xl border border-vo-line bg-vo-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Grid Capacity</h3>
                  <p className="text-xs text-vo-muted">Feeder capacity status and headroom summary</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTechDetails(!showTechDetails)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-vo-line text-xs text-vo-muted hover:text-white transition-colors"
                >
                  <span>Technical details</span>
                  {showTechDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Simplified Grid Readiness Badges */}
              <div className="grid grid-cols-3 gap-4 pt-1">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <div className="text-xs font-semibold text-emerald-400 uppercase">Capacity Available</div>
                  <div className="text-lg font-bold text-white font-mono mt-1">
                    {sites.filter((s) => s.grid_capacity_score >= 70).length} Sites
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                  <div className="text-xs font-semibold text-amber-400 uppercase">At Risk / Needs Management</div>
                  <div className="text-lg font-bold text-white font-mono mt-1">
                    {sites.filter((s) => s.grid_capacity_score >= 40 && s.grid_capacity_score < 70).length} Sites
                  </div>
                </div>

                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
                  <div className="text-xs font-semibold text-red-400 uppercase">Needs Upgrade</div>
                  <div className="text-lg font-bold text-white font-mono mt-1">
                    {sites.filter((s) => s.grid_capacity_score < 40).length} Sites
                  </div>
                </div>
              </div>

              {/* Expandable Technical Engineering Graph & Metrics */}
              {showTechDetails ? (
                <div className="pt-4 border-t border-vo-line/60 space-y-3">
                  <div className="text-xs font-semibold text-vo-accent uppercase tracking-wider">Feeder Headroom vs Peak Load Analysis</div>
                  <div className="h-[240px]">
                    <FeederChart sites={sites} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </ScreenState>
    </div>
  );
}

function getRecommendedChargerCount(site: Site): number {
  if (site.recommendation === "BUILD") {
    return Math.max(4, Math.round(site.demand_score / 12));
  }
  if (site.recommendation === "BUILD_IF_MANAGED") {
    return Math.max(2, Math.round(site.demand_score / 18));
  }
  return 0;
}
