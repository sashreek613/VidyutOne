import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, MapPin, ArrowRight, ShieldCheck, Zap } from "lucide-react";

import { ScreenState } from "../../components/common/ScreenState";
import { FeederChart } from "../../components/planner/FeederChart";
import { SiteMap } from "../../components/planner/SiteMap";
import { TopBar } from "../../components/planner/TopBar";
import { useSites } from "../../hooks/useApiData";
import type { Site } from "../../types";

export function PlannerDashboardPage() {
  const { data: sites, error, loading } = useSites();
  const navigate = useNavigate();
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const list = sites ?? [];
    const total = list.length;
    const build = list.filter((s) => s.recommendation === "BUILD").length;
    const managed = list.filter((s) => s.recommendation === "BUILD_IF_MANAGED").length;
    const dont = list.filter((s) => s.recommendation === "DONT_BUILD").length;
    return { total, build, managed, dont };
  }, [sites]);

  const topRecommended = useMemo(() => {
    return (sites ?? [])
      .filter((s) => s.recommendation === "BUILD" || s.recommendation === "BUILD_IF_MANAGED")
      .sort((a, b) => b.site_score - a.site_score)
      .slice(0, 3);
  }, [sites]);

  const selectedSite = useMemo(() => {
    return (sites ?? []).find((s) => s.id === selectedSiteId) ?? null;
  }, [sites, selectedSiteId]);

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

            {/* Prominent Section: Recommended Locations to Build */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Recommended locations to build</span>
                  </h2>
                  <p className="text-xs text-vo-muted">Highest ROI candidate locations based on EV demand and grid headroom</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {topRecommended.map((site) => (
                  <RecommendedSiteCard key={site.id} site={site} onInspect={() => navigate(`/planner/site/${site.id}`)} />
                ))}
              </div>
            </div>

            {/* Map & Site Selection Overlay */}
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-vo-accent" />
                    <span>Bengaluru Siting Map</span>
                  </h3>
                  <div className="flex items-center space-x-3 text-xs text-vo-muted font-medium">
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>Build</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>Managed</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span>Unsuitable</span>
                    </span>
                  </div>
                </div>

                <div className="h-[420px] overflow-hidden rounded-2xl border border-vo-line relative shadow-lg">
                  <SiteMap
                    legend={false}
                    points={sites.map((site) => ({
                      id: site.id,
                      name: site.name,
                      latitude: site.latitude,
                      longitude: site.longitude,
                      recommendation: site.recommendation,
                    }))}
                    onPointClick={(id) => setSelectedSiteId(id)}
                  />

                  {/* Decision overlay card when a marker is selected */}
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
                        <p className="flex items-center space-x-1 text-gray-300">
                          <span>✓</span>
                          <span>Expected EV Demand: {selectedSite.demand_score >= 70 ? "Strong" : "Moderate"} ({Math.round(selectedSite.demand_score)}/100)</span>
                        </p>
                        <p className="flex items-center space-x-1 text-gray-300">
                          <span>✓</span>
                          <span>Grid Capacity: {selectedSite.grid_capacity_score >= 70 ? "Sufficient" : selectedSite.grid_capacity_score >= 40 ? "Requires load management" : "Constrained"}</span>
                        </p>
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
              </div>

              {/* Recommended Sites Sidebar List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Recommended Sites</h3>
                  <button
                    type="button"
                    onClick={() => navigate("/planner/explorer")}
                    className="text-xs text-vo-accent hover:underline font-medium"
                  >
                    View all sites →
                  </button>
                </div>

                <div className="space-y-3">
                  {sites.slice(0, 5).map((site) => (
                    <div
                      key={site.id}
                      className="rounded-xl border border-vo-line bg-vo-card p-3.5 space-y-2 hover:border-vo-accent/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{site.name.replace(" (demo)", "")}</span>
                        <span
                          className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: site.recommendation === "BUILD" ? "#00e8a215" : site.recommendation === "BUILD_IF_MANAGED" ? "#f0b42915" : "#ef5b5b15",
                            borderColor: site.recommendation === "BUILD" ? "#00e8a240" : site.recommendation === "BUILD_IF_MANAGED" ? "#f0b42940" : "#ef5b5b40",
                            color: site.recommendation === "BUILD" ? "#00e8a2" : site.recommendation === "BUILD_IF_MANAGED" ? "#f0b429" : "#ef5b5b",
                          }}
                        >
                          {site.recommendation.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-vo-muted">
                        {site.recommendation === "BUILD"
                          ? "High demand + sufficient grid capacity"
                          : site.recommendation === "BUILD_IF_MANAGED"
                          ? "High demand + load management required"
                          : "Insufficient demand or low grid headroom"}
                      </p>
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(`/planner/site/${site.id}`)}
                          className="text-xs text-vo-accent hover:underline font-medium"
                        >
                          View site →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

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

function RecommendedSiteCard({ site, onInspect }: { site: Site; onInspect: () => void }) {
  const isBuild = site.recommendation === "BUILD";
  const chargerCount = getRecommendedChargerCount(site);

  return (
    <div className={`rounded-2xl border p-5 space-y-3 flex flex-col justify-between ${
      isBuild ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
    }`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${
            isBuild ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          }`}>
            {isBuild ? "🟢 BUILD" : "🟡 BUILD IF MANAGED"}
          </span>
          <span className="text-xs text-vo-muted font-mono">Score: {site.site_score}</span>
        </div>

        <h3 className="text-base font-bold text-white">{site.name.replace(" (demo)", "")}</h3>

        <div className="text-xs text-vo-muted space-y-1">
          <p className="flex items-center space-x-1.5 text-gray-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isBuild ? "High EV demand & capacity available" : "High EV demand, load management required"}</span>
          </p>
          <p className="text-vo-accent font-semibold">Recommended: {chargerCount} Chargers</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onInspect}
        className="w-full py-2 rounded-xl bg-vo-card border border-vo-line hover:border-vo-accent/40 text-xs font-semibold text-white transition-colors flex items-center justify-center space-x-1"
      >
        <span>View site</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
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
