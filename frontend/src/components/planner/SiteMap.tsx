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

export interface MapFocus {
  latitude: number;
  longitude: number;
  zoom?: number;
}

interface SiteMapProps {
  points: MapPoint[];
  styleUrl?: string;
  onPointClick?: (id: string) => void;
  /** Fires for a click anywhere on the map that ISN'T a candidate marker
   * (marker clicks call stopPropagation and only fire onPointClick). */
  onMapClick?: (lat: number, lon: number) => void;
  interactive?: boolean;
  className?: string;
  center?: [number, number];
  zoom?: number;
  legend?: boolean;
  /** Imperative fly-to target. Changing this NEVER recreates the map --
   * see the dedicated effect below. Pass null/undefined to leave the
   * camera where it is. */
  focus?: MapFocus | null;
  /** The searched/clicked point, rendered as a larger, pulsing marker in
   * its own ref so repainting `points` never removes it. */
  highlight?: MapPoint | null;
}

const DEFAULT_DARK = "https://tiles.openfreemap.org/styles/dark";
const BENGALURU: [number, number] = [77.5946, 12.9716];

// How long we'll wait for the "load" event before treating the style as
// failed-to-load. A transient tile/glyph/sprite error after a successful
// load does NOT trip this -- only a style that never loads does.
const STYLE_LOAD_TIMEOUT_MS = 8000;

export function SiteMap({
  points,
  styleUrl,
  onPointClick,
  onMapClick,
  interactive = true,
  className = "h-full w-full",
  center = BENGALURU,
  zoom = 11,
  legend = false,
  focus = null,
  highlight = null,
}: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const highlightMarkerRef = useRef<Marker | null>(null);
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const resolvedStyle = styleUrl ?? import.meta.env.VITE_MAP_STYLE_DARK ?? DEFAULT_DARK;

  // Read once on mount. Later changes to `center`/`zoom` must NOT tear down
  // and recreate the map -- use the `focus` prop (flyTo) for that instead.
  const initialViewRef = useRef({ center, zoom });

  // Kept up to date without being a dependency of the init effect, so the
  // map-level click listener (registered once) always calls the latest
  // callback without needing to be re-created.
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // --- Map lifecycle: created ONCE per style. Deps are [resolvedStyle,
  // failed] only -- see the module comment on STYLE_LOAD_TIMEOUT_MS for why
  // `failed` is the only other dependency (it drives teardown, not re-init).
  useEffect(() => {
    if (!containerRef.current || failed) {
      return;
    }

    const map = new MapLibreMap({
      container: containerRef.current,
      style: resolvedStyle,
      center: initialViewRef.current.center,
      zoom: initialViewRef.current.zoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    let loaded = false;
    // React StrictMode (see main.tsx) intentionally mounts every effect,
    // tears it down, then mounts it again in dev -- so the FIRST map
    // instance here gets .remove()'d almost immediately while its style/
    // tile fetch is still in flight, and that aborted fetch can fire an
    // async "error" event well after cleanup. Every callback that touches
    // shared state (setFailed, mapRef) must check it's still the live
    // instance before acting, or a stale instance's late error silently
    // kills the real, working map that replaced it.
    const isCurrent = () => mapRef.current === map;

    const fail = (reason: unknown) => {
      if (!isCurrent()) {
        return;
      }
      console.error("[SiteMap] style failed to load, falling back to radar view:", reason);
      window.clearTimeout(timeoutId);
      setFailed(true);
      map.remove();
      mapRef.current = null;
    };

    const timeoutId = window.setTimeout(() => {
      if (!loaded) {
        fail(`no "load" event within ${STYLE_LOAD_TIMEOUT_MS}ms`);
      }
    }, STYLE_LOAD_TIMEOUT_MS);

    map.once("load", () => {
      loaded = true;
      window.clearTimeout(timeoutId);
    });

    // A single failed tile/glyph/sprite request must NOT drop the whole map
    // to the fallback -- only a failure before the style has ever loaded
    // (the style/sprite/glyph request itself) is fatal. Always log.
    map.on("error", (event) => {
      if (!isCurrent()) {
        return; // stale instance (see StrictMode note above) -- already torn down, ignore
      }
      console.error("[SiteMap] map error:", event.error ?? event);
      if (!loaded) {
        fail(event.error ?? event);
      }
    });

    map.on("click", (event) => {
      onMapClickRef.current?.(event.lngLat.lat, event.lngLat.lng);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      highlightMarkerRef.current?.remove();
      highlightMarkerRef.current = null;
      window.clearTimeout(timeoutId);
      // Only remove the instance THIS invocation created -- if `fail()`
      // already tore it down (or a newer invocation already took over),
      // mapRef.current won't be `map` any more and there's nothing to do.
      if (isCurrent()) {
        map.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: center/zoom/onMapClick are read via refs, not deps, so the map is never recreated for them.
  }, [resolvedStyle, failed]);

  // --- Candidate marker painting. Repaints on every `points` change but
  // never touches the highlight marker (separate ref/effect below).
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

  // --- Highlight marker: the searched/clicked point. Its own ref so
  // repainting candidate markers above never removes it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || failed || !highlight) {
      return;
    }

    const paintHighlight = () => {
      const color = highlight.color ?? (highlight.recommendation ? RECOMMENDATION_COLOR[highlight.recommendation] : "#38bdf8");
      const el = document.createElement("div");
      el.className = "relative flex h-8 w-8 items-center justify-center";
      el.setAttribute("aria-label", highlight.name);
      el.innerHTML = `
        <span class="absolute h-8 w-8 animate-ping rounded-full" style="background:${color}55"></span>
        <span class="relative h-5 w-5 rounded-full border-2 border-white shadow-[0_0_0_5px_rgba(0,0,0,0.35)]" style="background:${color}"></span>
      `;
      highlightMarkerRef.current = new Marker({ element: el }).setLngLat([highlight.longitude, highlight.latitude]).addTo(map);
    };

    if (map.loaded()) {
      paintHighlight();
    } else {
      map.once("load", paintHighlight);
    }

    return () => {
      highlightMarkerRef.current?.remove();
      highlightMarkerRef.current = null;
    };
  }, [failed, highlight]);

  // --- Imperative fly-to. Never recreates the map -- see the lifecycle
  // effect above, which has no dependency on `focus`.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || failed || !focus) {
      return;
    }
    const flyTo = () => {
      map.flyTo({ center: [focus.longitude, focus.latitude], zoom: focus.zoom ?? 14, duration: 1200 });
    };
    if (map.loaded()) {
      flyTo();
    } else {
      map.once("load", flyTo);
    }
  }, [failed, focus]);

  if (failed) {
    return <RadarFallback points={points} highlight={highlight} onPointClick={onPointClick} legend={legend} />;
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
  highlight,
  onPointClick,
  legend,
}: {
  points: MapPoint[];
  highlight?: MapPoint | null;
  onPointClick?: (id: string) => void;
  legend: boolean;
}) {
  const allPoints = highlight ? [...points, highlight] : points;
  const lats = allPoints.map((p) => p.latitude);
  const lons = allPoints.map((p) => p.longitude);
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
      {highlight ? (
        <span
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_5px_rgba(0,0,0,0.35)]"
          style={{
            left: `${((highlight.longitude - minLon) / (maxLon - minLon)) * 80 + 10}%`,
            top: `${(1 - (highlight.latitude - minLat) / (maxLat - minLat)) * 80 + 10}%`,
            background: highlight.color ?? (highlight.recommendation ? RECOMMENDATION_COLOR[highlight.recommendation] : "#38bdf8"),
          }}
          aria-label={highlight.name}
        />
      ) : null}
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
