import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, Popup, type StyleSpecification } from "maplibre-gl";

import type { Charger, ClassifiedSite, Recommendation, Site } from "../../types";
import { RECOMMENDATION_COLOR, RECOMMENDATION_LABEL } from "../../utils/recommendations";

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

export interface SiteMapProps {
  points?: MapPoint[];
  chargers?: Charger[];
  styleUrl?: string;
  onPointClick?: (id: string) => void;
  /** Fires for a click anywhere on the map that ISN'T a marker
   * (marker clicks call stopPropagation). */
  onMapClick?: (lat: number, lon: number) => void;
  interactive?: boolean;
  className?: string;
  center?: [number, number];
  zoom?: number;
  legend?: boolean;
  /** Imperative fly-to target. Changing this NEVER recreates the map. */
  focus?: MapFocus | null;
  /** The searched/clicked point, rendered as a larger, pulsing marker. */
  highlight?: MapPoint | null;
  /** Full classification result from backend /api/sites/classify for popup metrics. */
  classifiedResult?: ClassifiedSite | null;
  /** Selected candidate site for popup details. */
  selectedSite?: Site | null;
}

const BENGALURU: [number, number] = [77.5946, 12.9716];

// Bengaluru BBMP Model Bounds
const BBMP_MIN_LAT = 12.8334905;
const BBMP_MAX_LAT = 13.1426196;
const BBMP_MIN_LON = 77.4598797;
const BBMP_MAX_LON = 77.7840639;

// Fast, reliable CARTO Voyager light map style (crisp roads, boundaries, geography)
const CARTO_LIGHT_VOYAGER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "carto-voyager": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\">OpenStreetMap</a> &copy; <a href=\"https://carto.com/attributions\" target=\"_blank\">CARTO</a>",
    },
  },
  layers: [
    {
      id: "carto-voyager-tiles",
      type: "raster",
      source: "carto-voyager",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

function buildRecommendationPopupHTML(data: {
  name: string;
  latitude: number;
  longitude: number;
  recommendation?: Recommendation;
  site_score?: number;
  demand_score?: number;
  grid_capacity_score?: number;
  accessibility_score?: number;
  charger_gap_score?: number;
  nearest_candidate?: { name: string; distance_km: number } | null;
}): string {
  const color = data.recommendation ? RECOMMENDATION_COLOR[data.recommendation] : "#10b981";
  const label = data.recommendation ? RECOMMENDATION_LABEL[data.recommendation] : "ASSESSED LOCATION";
  const formattedTitle = data.name.replace(" (demo)", "");
  const coords = `${data.latitude.toFixed(4)}°N, ${data.longitude.toFixed(4)}°E`;

  let scoreBadge = "";
  if (typeof data.site_score === "number") {
    scoreBadge = `<div style="font-family:monospace;font-weight:700;font-size:13px;color:${color}">${data.site_score.toFixed(1)}/100</div>`;
  }

  let factorsGrid = "";
  if (typeof data.grid_capacity_score === "number") {
    factorsGrid = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px">
        <div><span style="color:#64748b">Grid Headroom:</span> <b style="color:#0f172a">${Math.round(data.grid_capacity_score)}</b></div>
        <div><span style="color:#64748b">EV Demand:</span> <b style="color:#0f172a">${Math.round(data.demand_score ?? 0)}</b></div>
        <div><span style="color:#64748b">Accessibility:</span> <b style="color:#0f172a">${Math.round(data.accessibility_score ?? 0)}</b></div>
        <div><span style="color:#64748b">Charger Gap:</span> <b style="color:#0f172a">${Math.round(data.charger_gap_score ?? 0)}</b></div>
      </div>
    `;
  }

  let nearestInfo = "";
  if (data.nearest_candidate) {
    nearestInfo = `
      <div style="margin-top:6px;font-size:10.5px;color:#64748b">
        Nearest station: <span style="color:#334155;font-weight:600">${data.nearest_candidate.name.replace(" (demo)", "")}</span> (${data.nearest_candidate.distance_km.toFixed(1)} km)
      </div>
    `;
  }

  return `
    <div style="min-width:220px;max-width:270px;font-family:var(--font-sans, sans-serif);padding:2px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">
        <span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:0.05em;background:${color}18;color:${color};border:1px solid ${color}44">
          ● ${label}
        </span>
        ${scoreBadge}
      </div>
      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-top:4px;line-height:1.2">
        ${formattedTitle}
      </div>
      <div style="font-family:monospace;font-size:10px;color:#64748b;margin-top:2px">
        ${coords}
      </div>
      ${factorsGrid}
      ${nearestInfo}
    </div>
  `;
}

function buildChargerPopupHTML(charger: Charger): string {
  const isAvailable = charger.availability !== false;
  const powerText = charger.power_kw ? `${charger.power_kw} kW` : "Fast Charger";
  const priceText = charger.price_per_kwh ? `₹${charger.price_per_kwh}/kWh` : "Standard Rate";
  const connectorText = charger.connector_type || "Type 2 / CCS2";

  return `
    <div style="min-width:200px;max-width:250px;font-family:var(--font-sans, sans-serif);padding:2px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="height:8px;width:8px;border-radius:9999px;background:${isAvailable ? "#10b981" : "#f59e0b"}"></span>
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:${isAvailable ? "#047857" : "#b45309"}">
          ${isAvailable ? "Operating / Available" : "In Use / Busy"}
        </span>
      </div>
      <div style="font-weight:700;font-size:13px;color:#0f172a;line-height:1.2">
        ${charger.name}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px">
        <div><span style="color:#64748b">Power:</span> <b style="color:#0f172a">${powerText}</b></div>
        <div><span style="color:#64748b">Rate:</span> <b style="color:#0f172a">${priceText}</b></div>
        <div style="grid-column:span 2"><span style="color:#64748b">Connector:</span> <b style="color:#0f172a">${connectorText}</b></div>
      </div>
    </div>
  `;
}

export function SiteMap({
  chargers = [],
  styleUrl,
  onPointClick,
  onMapClick,
  interactive = true,
  className = "h-full w-full",
  center = BENGALURU,
  zoom = 11.5,
  legend = false,
  focus = null,
  highlight = null,
  classifiedResult = null,
  selectedSite = null,
}: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const chargerMarkersRef = useRef<Marker[]>([]);
  const highlightMarkerRef = useRef<Marker | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [clickedCharger, setClickedCharger] = useState<Charger | null>(null);

  const activeStyle = styleUrl ?? CARTO_LIGHT_VOYAGER_STYLE;
  const initialViewRef = useRef({ center, zoom });

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // --- Map lifecycle: created ONCE.
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const map = new MapLibreMap({
      container: containerRef.current,
      style: activeStyle,
      center: initialViewRef.current.center,
      zoom: initialViewRef.current.zoom,
      maxBounds: [
        [77.38, 12.78],
        [77.86, 13.20],
      ],
      attributionControl: { compact: true },
      interactive,
    });
    mapRef.current = map;

    const isCurrent = () => mapRef.current === map;

    const handleResize = () => {
      if (isCurrent()) {
        map.resize();
      }
    };

    map.once("load", handleResize);

    // Dynamic container resize observer to prevent 0x0 / blank canvas issues
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    map.on("click", (event) => {
      const lat = event.lngLat.lat;
      const lon = event.lngLat.lng;
      setClickedCharger(null);
      // Ensure clicked point is within the supported BBMP model region before dispatching
      if (lat >= BBMP_MIN_LAT && lat <= BBMP_MAX_LAT && lon >= BBMP_MIN_LON && lon <= BBMP_MAX_LON) {
        onMapClickRef.current?.(lat, lon);
      }
    });

    return () => {
      resizeObserver.disconnect();
      chargerMarkersRef.current.forEach((marker) => marker.remove());
      chargerMarkersRef.current = [];
      highlightMarkerRef.current?.remove();
      highlightMarkerRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;

      if (isCurrent()) {
        map.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStyle, interactive]);

  // --- Render Clean Existing Charger Pins (No red/orange/green analytical dots)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const paintChargers = () => {
      chargerMarkersRef.current.forEach((marker) => marker.remove());
      chargerMarkersRef.current = [];

      chargers.forEach((charger) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "group relative flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-emerald-400 border-2 border-white shadow-md hover:scale-125 hover:bg-emerald-500 hover:text-slate-950 transition-all cursor-pointer z-10";
        el.setAttribute("aria-label", charger.name);
        el.setAttribute("title", `[Existing Station] ${charger.name}`);
        el.innerHTML = `
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        `;

        el.addEventListener("click", (event) => {
          event.stopPropagation();
          setClickedCharger(charger);
          if (onPointClick) {
            onPointClick(charger.id);
          }
        });

        const marker = new Marker({ element: el }).setLngLat([charger.longitude, charger.latitude]).addTo(map);
        chargerMarkersRef.current.push(marker);
      });
    };

    if (map.loaded()) {
      paintChargers();
    } else {
      map.once("load", paintChargers);
    }
  }, [chargers, onPointClick]);

  // --- Highlight marker: the searched or clicked target pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !highlight) {
      highlightMarkerRef.current?.remove();
      highlightMarkerRef.current = null;
      return;
    }

    const paintHighlight = () => {
      highlightMarkerRef.current?.remove();
      const color = highlight.color ?? (highlight.recommendation ? RECOMMENDATION_COLOR[highlight.recommendation] : "#0284c7");
      const el = document.createElement("div");
      el.className = "relative flex h-8 w-8 items-center justify-center cursor-pointer z-20";
      el.setAttribute("aria-label", highlight.name);
      el.innerHTML = `
        <span class="absolute h-8 w-8 animate-ping rounded-full" style="background:${color}44"></span>
        <span class="relative h-5 w-5 rounded-full border-2 border-white shadow-lg" style="background:${color}"></span>
      `;
      highlightMarkerRef.current = new Marker({ element: el }).setLngLat([highlight.longitude, highlight.latitude]).addTo(map);
    };

    if (map.loaded()) {
      paintHighlight();
    } else {
      map.once("load", paintHighlight);
    }
  }, [highlight]);

  // --- Anchored MapLibre Popup for Recommendation assessment or Charger details
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const updatePopup = () => {
      // 1. Existing Charger Popup takes priority if clicked
      if (clickedCharger) {
        const html = buildChargerPopupHTML(clickedCharger);
        if (!popupRef.current) {
          popupRef.current = new Popup({ closeButton: true, closeOnClick: false, maxWidth: "260px" });
        }
        popupRef.current
          .setLngLat([clickedCharger.longitude, clickedCharger.latitude])
          .setHTML(html)
          .addTo(map);
        return;
      }

      // 2. Otherwise show location assessment popup for active target/search
      const activeTarget = classifiedResult || selectedSite || (highlight && highlight.recommendation ? highlight : null);

      if (activeTarget && activeTarget.latitude && activeTarget.longitude) {
        const isClassified = classifiedResult && classifiedResult.latitude === activeTarget.latitude;
        const isSite = selectedSite && selectedSite.latitude === activeTarget.latitude;

        const html = buildRecommendationPopupHTML({
          name: activeTarget.name || `${activeTarget.latitude.toFixed(4)}, ${activeTarget.longitude.toFixed(4)}`,
          latitude: activeTarget.latitude,
          longitude: activeTarget.longitude,
          recommendation: activeTarget.recommendation,
          site_score: isClassified
            ? classifiedResult.site_score
            : isSite
              ? selectedSite.site_score
              : undefined,
          demand_score: isClassified
            ? classifiedResult.demand_score
            : isSite
              ? selectedSite.demand_score
              : undefined,
          grid_capacity_score: isClassified
            ? classifiedResult.grid_capacity_score
            : isSite
              ? selectedSite.grid_capacity_score
              : undefined,
          accessibility_score: isClassified
            ? classifiedResult.accessibility_score
            : isSite
              ? selectedSite.accessibility_score
              : undefined,
          charger_gap_score: isClassified
            ? classifiedResult.charger_gap_score
            : isSite
              ? selectedSite.charger_gap_score
              : undefined,
          nearest_candidate: isClassified ? classifiedResult.nearest_candidate : undefined,
        });

        if (!popupRef.current) {
          popupRef.current = new Popup({ closeButton: true, closeOnClick: false, maxWidth: "280px" });
        }
        popupRef.current
          .setLngLat([activeTarget.longitude, activeTarget.latitude])
          .setHTML(html)
          .addTo(map);
      } else {
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      }
    };

    if (map.loaded()) {
      updatePopup();
    } else {
      map.once("load", updatePopup);
    }
  }, [classifiedResult, selectedSite, highlight, clickedCharger]);

  // --- Imperative fly-to camera movement
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) {
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
  }, [focus]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      {legend && classifiedResult ? <MapLegend result={classifiedResult} /> : null}
    </div>
  );
}

function MapLegend({ result }: { result: ClassifiedSite }) {
  const color = result.recommendation ? RECOMMENDATION_COLOR[result.recommendation] : "#10b981";
  const label = result.recommendation ? RECOMMENDATION_LABEL[result.recommendation] : "ASSESSED";

  return (
    <div className="absolute bottom-4 left-4 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 text-[11px] text-slate-800 shadow-lg backdrop-blur z-10 font-sans">
      <p className="mb-0.5 tracking-[0.14em] text-slate-400 font-mono text-[10px] uppercase font-bold">LAST ASSESSMENT</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="font-bold text-slate-900">{result.name.replace(" (demo)", "")}</span>
        <span className="font-mono text-xs font-bold" style={{ color }}>{result.site_score.toFixed(1)}/100 ({label})</span>
      </div>
    </div>
  );
}

export function SiteMarker({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full border-2 border-white shadow-sm"
      style={{ background: color }}
    />
  );
}
