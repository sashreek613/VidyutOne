import { useMemo, useState } from "react";
import { FileText, Download, Printer, Filter } from "lucide-react";

import { ScreenState } from "../../components/common/ScreenState";
import { TopBar } from "../../components/planner/TopBar";
import { useSites } from "../../hooks/useApiData";
import { insightsForSite } from "../../utils/siteInsights";

export function PlannerReportsPage() {
  const { data: sites, error, loading } = useSites();
  const [filter, setFilter] = useState<string>("ALL");

  const filteredSites = useMemo(() => {
    const list = sites ?? [];
    if (filter === "ALL") return list;
    return list.filter((s) => s.recommendation === filter);
  }, [sites, filter]);

  const summary = useMemo(() => {
    const list = sites ?? [];
    const totalSites = list.length;
    const build = list.filter((s) => s.recommendation === "BUILD").length;
    const managed = list.filter((s) => s.recommendation === "BUILD_IF_MANAGED").length;
    const dont = list.filter((s) => s.recommendation === "DONT_BUILD").length;

    const totalChargers = list.reduce((acc, s) => {
      if (s.recommendation === "BUILD") return acc + Math.max(4, Math.round(s.demand_score / 12));
      if (s.recommendation === "BUILD_IF_MANAGED") return acc + Math.max(2, Math.round(s.demand_score / 18));
      return acc;
    }, 0);

    return { totalSites, build, managed, dont, totalChargers };
  }, [sites]);

  function exportCSV() {
    if (!sites) return;
    const headers = ["Site ID", "Site Name", "Decision", "Demand Score", "Grid Capacity Score", "Recommended Chargers", "Feeder"];
    const rows = sites.map((s) => [
      s.id,
      `"${s.name.replace(" (demo)", "")}"`,
      s.recommendation,
      s.demand_score,
      s.grid_capacity_score,
      s.recommendation === "BUILD" ? Math.max(4, Math.round(s.demand_score / 12)) : s.recommendation === "BUILD_IF_MANAGED" ? Math.max(2, Math.round(s.demand_score / 18)) : 0,
      `"${insightsForSite(s).feederName}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "VidyutOne_EV_Infrastructure_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="min-h-screen pb-12 bg-vo-bg text-vo-text">
      <TopBar title="Reports" />
      <ScreenState loading={loading} error={error} empty={!loading && !error && (sites?.length ?? 0) === 0}>
        {sites ? (
          <div className="print-report space-y-6 px-6 py-6 max-w-7xl mx-auto">
            {/* Header & Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-vo-text flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-vo-accent" />
                  <span>Infrastructure Planning Executive Report</span>
                </h1>
                <p className="text-xs text-vo-muted mt-0.5">
                  Official decision summary for DISCOM and municipal infrastructure committees.
                </p>
              </div>

              <div className="no-print flex items-center space-x-3">
                <button
                  type="button"
                  onClick={exportCSV}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-vo-card border border-vo-line hover:border-vo-accent/40 text-xs font-semibold text-vo-text transition-colors"
                >
                  <Download className="w-4 h-4 text-vo-accent" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-vo-accent text-black font-semibold text-xs hover:bg-emerald-300 transition-colors shadow-md shadow-emerald-400/10"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* Executive Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-vo-line bg-vo-card p-5 space-y-1">
                <p className="text-xs font-medium uppercase text-vo-muted">Assessed Locations</p>
                <div className="text-2xl font-bold text-vo-text font-mono">{summary.totalSites}</div>
                <p className="text-xs text-vo-muted">Bengaluru Division</p>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-1">
                <p className="text-xs font-semibold uppercase text-emerald-400">Total Recommended Chargers</p>
                <div className="text-2xl font-bold text-emerald-400 font-mono">{summary.totalChargers} Units</div>
                <p className="text-xs text-emerald-300/80">Across Phase 1 locations</p>
              </div>

              <div className="rounded-2xl border border-vo-line bg-vo-card p-5 space-y-1">
                <p className="text-xs font-medium uppercase text-vo-muted">Direct Build Sites</p>
                <div className="text-2xl font-bold text-vo-text font-mono">{summary.build} Sites</div>
                <p className="text-xs text-vo-muted">Grid capacity available</p>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-1">
                <p className="text-xs font-semibold uppercase text-amber-400">Managed Opportunity Sites</p>
                <div className="text-2xl font-bold text-amber-400 font-mono">{summary.managed} Sites</div>
                <p className="text-xs text-amber-300/80">Viable via smart load scheduling</p>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="rounded-2xl border border-vo-line bg-vo-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-base font-bold text-vo-text">Full Site Assessment Table</h2>

                <div className="no-print flex items-center space-x-2">
                  <Filter className="w-3.5 h-3.5 text-vo-muted" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="rounded-xl border border-vo-line bg-vo-elevated px-3 py-1.5 text-xs text-vo-text focus:border-vo-accent focus:outline-none"
                  >
                    <option value="ALL">All Decisions</option>
                    <option value="BUILD">🟢 BUILD Only</option>
                    <option value="BUILD_IF_MANAGED">🟡 BUILD IF MANAGED Only</option>
                    <option value="DONT_BUILD">🔴 DO NOT BUILD Only</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-vo-line/80 text-vo-muted font-mono uppercase">
                      <th className="pb-3 font-semibold">Location</th>
                      <th className="pb-3 font-semibold">Decision</th>
                      <th className="pb-3 font-semibold">EV Demand</th>
                      <th className="pb-3 font-semibold">Grid Capacity</th>
                      <th className="pb-3 font-semibold">Rec. Chargers</th>
                      <th className="pb-3 font-semibold">Action Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vo-line/40 text-vo-soft">
                    {filteredSites.map((site) => {
                      const isBuild = site.recommendation === "BUILD";
                      const isManaged = site.recommendation === "BUILD_IF_MANAGED";
                      const chargers = isBuild
                        ? Math.max(4, Math.round(site.demand_score / 12))
                        : isManaged
                        ? Math.max(2, Math.round(site.demand_score / 18))
                        : 0;

                      return (
                        <tr key={site.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 font-bold text-vo-text">{site.name.replace(" (demo)", "")}</td>
                          <td className="py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                                isBuild
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : isManaged
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                  : "bg-red-500/10 border-red-500/30 text-red-400"
                              }`}
                            >
                              {isBuild ? "BUILD" : isManaged ? "BUILD IF MANAGED" : "DO NOT BUILD"}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono">{Math.round(site.demand_score)} / 100</td>
                          <td className="py-3.5 font-mono">{Math.round(site.grid_capacity_score)} / 100</td>
                          <td className="py-3.5 font-mono text-vo-accent font-bold">{chargers} Units</td>
                          <td className="py-3.5 text-vo-muted">
                            {isBuild
                              ? "Proceed with tender & installation"
                              : isManaged
                              ? "Install smart load controllers"
                              : "De-prioritize location"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </ScreenState>
    </div>
  );
}
