import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ScreenState } from "../../components/common/ScreenState";
import { ChartCard } from "../../components/planner/ChartCard";
import { FeederChart } from "../../components/planner/FeederChart";
import { MetricCard } from "../../components/planner/MetricCard";
import { RecentRecommendations } from "../../components/planner/RecentRecommendations";
import { SiteMap } from "../../components/planner/SiteMap";
import { TopBar } from "../../components/planner/TopBar";
import { useSites } from "../../hooks/useApiData";

export function PlannerDashboardPage() {
  const { data: sites, error, loading } = useSites();
  const navigate = useNavigate();
  const [layer, setLayer] = useState<"verdict" | "risk">("verdict");

  const kpis = useMemo(() => {
    const list = sites ?? [];
    const total = list.length;
    const build = list.filter((site) => site.recommendation === "BUILD").length;
    const managed = list.filter((site) => site.recommendation === "BUILD_IF_MANAGED").length;
    const risk = list.filter((site) => site.recommendation === "DONT_BUILD").length;
    return { total, build, managed, risk };
  }, [sites]);

  return (
    <div className="min-h-screen">
      <TopBar title="Siting Overview" />
      <ScreenState loading={loading} error={error} empty={!loading && !error && (sites?.length ?? 0) === 0}>
        {sites ? (
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Candidate sites"
                value={String(kpis.total)}
                hint="Live demo set from the VidyutOne API"
                bar={100}
              />
              <MetricCard
                label="Recommended"
                value={String(kpis.build)}
                delta={kpis.total ? `${Math.round((kpis.build / kpis.total) * 100)}%` : "0%"}
                deltaTone="green"
                hint="Clear on demand and headroom."
                bar={kpis.total ? (kpis.build / kpis.total) * 100 : 0}
                barColor="#00e8a2"
              />
              <MetricCard
                label="Build if managed"
                value={String(kpis.managed)}
                delta={kpis.total ? `${Math.round((kpis.managed / kpis.total) * 100)}%` : "0%"}
                deltaTone="amber"
                hint="Needs load control or staging."
                bar={kpis.total ? (kpis.managed / kpis.total) * 100 : 0}
                barColor="#f0b429"
              />
              <MetricCard
                label="High grid risk"
                value={String(kpis.risk)}
                delta={kpis.total ? `${Math.round((kpis.risk / kpis.total) * 100)}%` : "0%"}
                deltaTone="red"
                hint="Does not clear current siting rule."
                bar={kpis.total ? (kpis.risk / kpis.total) * 100 : 0}
                barColor="#ef5b5b"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
              <ChartCard
                id="map"
                title="Bengaluru siting map"
                meta={`${kpis.total} SITES · DEMO FEEDERS`}
                action={
                  <div className="flex gap-2">
                    <LayerButton active={layer === "verdict"} onClick={() => setLayer("verdict")}>
                      Verdict
                    </LayerButton>
                    <LayerButton active={layer === "risk"} onClick={() => setLayer("risk")}>
                      Grid risk
                    </LayerButton>
                  </div>
                }
                className="min-h-[420px]"
              >
                <div className="h-[360px] overflow-hidden rounded-xl border border-vo-line">
                  <SiteMap
                    legend
                    points={sites.map((site) => ({
                      id: site.id,
                      name: site.name,
                      latitude: site.latitude,
                      longitude: site.longitude,
                      recommendation: layer === "verdict" ? site.recommendation : undefined,
                      color: layer === "risk" ? (site.grid_capacity_score < 50 ? "#ef5b5b" : "#00e8a2") : undefined,
                    }))}
                    onPointClick={(id) => {
                      void navigate(`/planner/site/${id}`);
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-vo-muted">Click a marker to open site intelligence.</p>
              </ChartCard>

              <div className="flex flex-col gap-4">
                <ChartCard id="grid" title="Feeder headroom vs demand" meta="PEAK 19:00">
                  <FeederChart sites={sites} />
                </ChartCard>
                <ChartCard
                  title="Recent recommendations"
                  action={
                    <span className="text-[12px] text-vo-accent">View all</span>
                  }
                >
                  <RecentRecommendations sites={sites} />
                </ChartCard>
              </div>
            </div>
          </div>
        ) : null}
      </ScreenState>
    </div>
  );
}

function LayerButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[11px] ${
        active ? "border-vo-accent text-vo-accent" : "border-vo-border text-vo-muted"
      }`}
    >
      {children}
    </button>
  );
}
