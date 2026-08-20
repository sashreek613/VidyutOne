import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map as MapLibreMap, Marker } from "maplibre-gl";

import type { Recommendation } from "../../types";
import { RECOMMENDATION_COLOR } from "../../utils/recommendations";

export interface MapPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  recommendation?: Recommendation;
  color?: string;
}

interface SiteMapProps {
  points: MapPoint[];
  styleUrl?: string;
  onPointClick?: (id: string) => void;
  interactive?: boolean;
  className?: string;
  center?: [number, number];
  zoom?: number;
  legend?: boolean;
}

const DEFAULT_DARK = "https://tiles.openfreemap.org/styles/dark";
const BENGALURU: [number, number] = [77.5946, 12.9716];

export function SiteMap({
  points,
  styleUrl,
  onPointClick,
  interactive = true,
  className = "h-full w-full",
  center = BENGALURU,
  zoom = 11,
  legend = false,
}: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const resolvedStyle = styleUrl ?? import.meta.env.VITE_MAP_STYLE_DARK ?? DEFAULT_DARK;

  useEffect(() => {
    if (!containerRef.current || failed) {
      return;
    }

    const map = new MapLibreMap({
      container: containerRef.current,
      style: resolvedStyle,
      center,
      zoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("error", () => {
      setFailed(true);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [center[0], center[1], failed, resolvedStyle, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || failed) {
      return;
    }

    const paint = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      points.forEach((point) => {
        const color = point.color ?? (point.recommendation ? RECOMMENDATION_COLOR[point.recommendation] : "#00e8a2");
        const el = document.createElement("button");
        el.type = "button";
        el.className = "h-3.5 w-3.5 rounded-full border-2 border-black/40 shadow-[0_0_0_4px_rgba(0,0,0,0.25)]";
        el.style.background = color;
        el.setAttribute("aria-label", point.name);
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          if (onPointClick) {
            onPointClick(point.id);
          } else if (interactive) {
            void navigate(`/planner/site/${point.id}`);
          }
        });
        const marker = new Marker({ element: el }).setLngLat([point.longitude, point.latitude]).addTo(map);
        markersRef.current.push(marker);
      });
    };

    if (map.loaded()) {
      paint();
    } else {
      map.once("load", paint);
    }
  }, [failed, interactive, navigate, onPointClick, points]);

  if (failed) {
    return <RadarFallback points={points} onPointClick={onPointClick} legend={legend} />;
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      {legend ? <MapLegend points={points} /> : null}
    </div>
  );
}

function MapLegend({ points }: { points: MapPoint[] }) {
  const build = points.filter((p) => p.recommendation === "BUILD").length;
  const managed = points.filter((p) => p.recommendation === "BUILD_IF_MANAGED").length;
  const dont = points.filter((p) => p.recommendation === "DONT_BUILD").length;
  return (
    <div className="absolute bottom-4 left-4 rounded-xl border border-vo-border bg-vo-surface/90 px-3 py-2 text-[11px] text-vo-soft backdrop-blur">
      <p className="mb-1 tracking-[0.16em] text-vo-muted">SITING VERDICT</p>
      <p>
        <span className="text-vo-accent">{build} Build</span>
        <span className="mx-2 text-vo-amber">{managed} Build if managed</span>
        <span className="text-vo-red">{dont} Don&apos;t build</span>
      </p>
    </div>
  );
}

function RadarFallback({
  points,
  onPointClick,
  legend,
}: {
  points: MapPoint[];
  onPointClick?: (id: string) => void;
  legend: boolean;
}) {
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats, 12.84);
  const maxLat = Math.max(...lats, 13.05);
  const minLon = Math.min(...lons, 77.52);
  const maxLon = Math.max(...lons, 77.76);

  return (
    <div className="relative h-full w-full overflow-hidden bg-vo-map vo-radar">
      {points.map((point) => {
        const left = ((point.longitude - minLon) / (maxLon - minLon)) * 80 + 10;
        const top = (1 - (point.latitude - minLat) / (maxLat - minLat)) * 80 + 10;
        const color = point.color ?? (point.recommendation ? RECOMMENDATION_COLOR[point.recommendation] : "#00e8a2");
        return (
          <button
            key={point.id}
            type="button"
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${left}%`, top: `${top}%`, background: color }}
            aria-label={point.name}
            onClick={() => onPointClick?.(point.id)}
          />
        );
      })}
      {legend ? <MapLegend points={points} /> : null}
    </div>
  );
}

export function SiteMarker({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full border-2 border-black/40"
      style={{ background: color }}
    />
  );
}
