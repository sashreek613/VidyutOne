import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, ArrowRight } from "lucide-react";

import { ScreenState } from "../../components/common/ScreenState";
import { TopBar } from "../../components/planner/TopBar";
import { useSites } from "../../hooks/useApiData";
import type { Site } from "../../types";

export function PlannerExplorerPage() {
  const { data: sites, error, loading } = useSites();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [demandFilter, setDemandFilter] = useState<string>("ALL");

  const filteredSites = useMemo(() => {
    let list = sites ?? [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }

    if (statusFilter !== "ALL") {
      list = list.filter((s) => s.recommendation === statusFilter);
    }

    if (demandFilter === "HIGH") {
      list = list.filter((s) => s.demand_score >= 70);
    } else if (demandFilter === "MEDIUM") {
      list = list.filter((s) => s.demand_score >= 50 && s.demand_score < 70);
    } else if (demandFilter === "LOW") {
      list = list.filter((s) => s.demand_score < 50);
    }

    return list;
  }, [sites, searchQuery, statusFilter, demandFilter]);

  return (
    <div className="min-h-screen pb-12 bg-vo-bg text-vo-text">
      <TopBar title="Site Explorer" />
      <ScreenState loading={loading} error={error} empty={!loading && !error && (sites?.length ?? 0) === 0}>
        {sites ? (
          <div className="space-y-6 px-6 py-6 max-w-7xl mx-auto">
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-vo-text">Candidate Site Explorer</h1>
                <p className="text-xs text-vo-muted mt-0.5">
                  Investigate individual candidate locations, demand projections, and grid suitability.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-vo-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search site name or ward..."
                    className="rounded-xl border border-vo-line bg-vo-card pl-9 pr-3 py-2 text-xs text-vo-text placeholder:text-vo-muted focus:border-vo-accent focus:outline-none w-56"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-vo-line bg-vo-card px-3 py-2 text-xs text-vo-text focus:border-vo-accent focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="BUILD">🟢 BUILD</option>
                  <option value="BUILD_IF_MANAGED">🟡 BUILD IF MANAGED</option>
                  <option value="DONT_BUILD">🔴 DO NOT BUILD</option>
                </select>

                <select
                  value={demandFilter}
                  onChange={(e) => setDemandFilter(e.target.value)}
                  className="rounded-xl border border-vo-line bg-vo-card px-3 py-2 text-xs text-vo-text focus:border-vo-accent focus:outline-none"
                >
                  <option value="ALL">All Demand Levels</option>
                  <option value="HIGH">High Demand (≥70)</option>
                  <option value="MEDIUM">Medium Demand (50-69)</option>
                  <option value="LOW">Low Demand (&lt;50)</option>
                </select>
              </div>
            </div>

            {/* Sites Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSites.map((site) => (
                <ExplorerSiteCard key={site.id} site={site} onInspect={() => navigate(`/planner/site/${site.id}`)} />
              ))}
            </div>

            {filteredSites.length === 0 ? (
              <div className="rounded-2xl border border-vo-line bg-vo-card p-12 text-center text-xs text-vo-muted space-y-2">
                <p className="text-sm font-semibold text-vo-text">No candidate sites match your filter criteria.</p>
                <p>Try clearing your search query or status filter.</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </ScreenState>
    </div>
  );
}

function ExplorerSiteCard({ site, onInspect }: { site: Site; onInspect: () => void }) {
  const isBuild = site.recommendation === "BUILD";
  const isManaged = site.recommendation === "BUILD_IF_MANAGED";

  const statusLabel = isBuild ? "BUILD" : isManaged ? "BUILD IF MANAGED" : "DO NOT BUILD";
  const statusColor = isBuild ? "#00e8a2" : isManaged ? "#f0b429" : "#ef5b5b";

  const recommendedChargers = isBuild
    ? Math.max(4, Math.round(site.demand_score / 12))
    : isManaged
    ? Math.max(2, Math.round(site.demand_score / 18))
    : 0;

  return (
    <div className="rounded-2xl border border-vo-line bg-vo-card p-5 space-y-4 flex flex-col justify-between hover:border-vo-accent/40 transition-colors shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border"
            style={{
              backgroundColor: `${statusColor}15`,
              borderColor: `${statusColor}40`,
              color: statusColor,
            }}
          >
            {statusLabel}
          </span>
          <span className="text-xs text-vo-muted font-mono">Score: {site.site_score}</span>
        </div>

        <div>
          <h3 className="text-base font-bold text-vo-text">{site.name.replace(" (demo)", "")}</h3>
          <p className="text-xs text-vo-muted flex items-center space-x-1 mt-0.5">
            <MapPin className="w-3 h-3 text-vo-accent" />
            <span>Bengaluru Urban Division</span>
          </p>
        </div>

        {/* Key Decision Metrics */}
        <div className="space-y-2 pt-1 text-xs">
          <div>
            <div className="flex justify-between text-vo-muted mb-1">
              <span>EV Demand Projection</span>
              <span className="font-bold text-vo-text font-mono">{Math.round(site.demand_score)}/100</span>
            </div>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${Math.min(100, site.demand_score)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-vo-muted border-t border-vo-line/40 pt-2">
            <span>Grid Readiness:</span>
            <span className="font-semibold text-vo-text">
              {site.grid_capacity_score >= 70 ? "Ready" : site.grid_capacity_score >= 40 ? "Needs Management" : "Upgrade Required"}
            </span>
          </div>

          <div className="flex items-center justify-between text-vo-muted">
            <span>Recommended Chargers:</span>
            <span className="font-semibold text-vo-accent">{recommendedChargers} Units</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onInspect}
        className="w-full py-2.5 rounded-xl bg-vo-elevated border border-vo-line hover:border-vo-accent/40 text-xs font-semibold text-vo-text transition-colors flex items-center justify-center space-x-1"
      >
        <span>Inspect site details</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
