import { Navigation, Zap, X, Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map as MapLibreMap, Marker, type StyleSpecification, type GeoJSONSource } from "maplibre-gl";

import type { Charger } from "../../types";
import { centroid, haversineKm } from "../../utils/geo";

interface DriverMapProps {
  chargers: Charger[];
  origin?: { latitude: number; longitude: number };
  /** Draws a translucent circle of this radius (km) around the driver
   * marker -- makes the range cutoff visible rather than a hidden filter.
   * Omit/null to draw no circle (e.g. no vehicle selected). */
  rangeKm?: number | null;
  /** true only when `origin` is real GPS (geoStatus === "granted" in
   * DriverHomePage.tsx) -- false for every fallback (denied, unavailable,
   * insecure context, or still pending). Adds a pulsing ring to the driver
   * marker so the map itself confirms live location, not just a text badge
   * someone might miss. */
  isLiveLocation?: boolean;
}

const RANGE_SOURCE_ID = "driver-range-circle";
const EARTH_KM = 6371;

// Fast, reliable CARTO Voyager light map style (crisp roads, street names, green parks)
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

/** Plain-math circle polygon for range circle visualization */
function circlePolygonCoordinates(centerLat: number, centerLon: number, radiusKm: number, points = 64): [number, number][] {
  const coords: [number, number][] = [];
  const latRad = (centerLat * Math.PI) / 180;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);
    const dLat = dy / EARTH_KM;
    const dLon = dx / (EARTH_KM * Math.cos(latRad));
    coords.push([centerLon + (dLon * 180) / Math.PI, centerLat + (dLat * 180) / Math.PI]);
  }
  return coords;
}

interface PolygonFeature {
  type: "Feature";
  properties: Record<string, never>;
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
}

function rangeCircleGeoJSON(centerLat: number, centerLon: number, radiusKm: number): PolygonFeature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [circlePolygonCoordinates(centerLat, centerLon, radiusKm)],
    },
  };
}

export function DriverMap({ chargers, origin, rangeKm, isLiveLocation = false }: DriverMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const navigate = useNavigate();
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);

  const here = origin ?? centroid(chargers);
  const activeStyle = CARTO_LIGHT_VOYAGER_STYLE;

  const initialCenterRef = useRef({ latitude: here.latitude, longitude: here.longitude });

  // --- Map Lifecycle: Created ONCE.
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const map = new MapLibreMap({
      container: ref.current,
      style: activeStyle,
      center: [initialCenterRef.current.longitude, initialCenterRef.current.latitude],
      zoom: 11.8,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    const isCurrent = () => mapRef.current === map;

    const handleResize = () => {
      if (isCurrent()) {
        map.resize();
      }
    };

    map.once("load", () => {
      handleResize();
      map.addSource(RANGE_SOURCE_ID, {
        type: "geojson",
        data: rangeCircleGeoJSON(here.latitude, here.longitude, rangeKm ?? 0),
      });
      map.addLayer({
        id: `${RANGE_SOURCE_ID}-fill`,
        type: "fill",
        source: RANGE_SOURCE_ID,
        paint: { "fill-color": "#10b981", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: `${RANGE_SOURCE_ID}-line`,
        type: "line",
        source: RANGE_SOURCE_ID,
        paint: { "line-color": "#10b981", "line-width": 1.5, "line-opacity": 0.5 },
      });
    });

    // Dynamic resize observer to ensure map canvas fills container smoothly
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(ref.current);

    map.on("click", (e) => {
      const target = e.originalEvent.target as HTMLElement | null;
      if (target && !target.closest("button")) {
        setSelectedCharger(null);
      }
    });

    return () => {
      resizeObserver.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (isCurrent()) {
        map.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStyle]);

  // Imperative camera flyTo without tearing down the MapLibre map instance
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const fly = () => {
      map.flyTo({ center: [here.longitude, here.latitude], zoom: 12.5, duration: 800 });
    };
    if (map.loaded()) {
      fly();
    } else {
      map.once("load", fly);
    }
  }, [here.latitude, here.longitude]);

  // Markers -- driver location + clean charger pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const paint = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Driver Live Location Marker
      const you = document.createElement("div");
      you.className = "relative flex h-4 w-4 items-center justify-center z-20";
      you.innerHTML = isLiveLocation
        ? '<span class="absolute h-8 w-8 rounded-full bg-emerald-500/35 animate-ping"></span><span class="relative h-4 w-4 rounded-full bg-slate-950 ring-4 ring-white shadow-lg"></span>'
        : '<span class="h-4 w-4 rounded-full bg-slate-950 ring-4 ring-white shadow-md"></span>';
      markersRef.current.push(new Marker({ element: you }).setLngLat([here.longitude, here.latitude]).addTo(map));

      // Clean Charger Pins
      chargers.forEach((charger) => {
        const isSelected = selectedCharger?.id === charger.id;
        const isAvailable = charger.availability !== false;
        const el = document.createElement("button");
        el.type = "button";
        el.className = isSelected
          ? "group relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-slate-950 ring-4 ring-emerald-300 shadow-xl scale-125 z-30 transition-transform cursor-pointer"
          : "group relative flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-emerald-400 border-2 border-white shadow-md hover:scale-125 hover:bg-emerald-500 hover:text-slate-950 transition-all cursor-pointer z-10";

        el.setAttribute("aria-label", charger.name);
        el.setAttribute("title", charger.name);
        el.innerHTML = `
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span class="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-1.5 border-white ${isAvailable ? "bg-emerald-500" : "bg-amber-500"}"></span>
        `;

        el.addEventListener("click", (event) => {
          event.stopPropagation();
          setSelectedCharger(charger);
        });

        markersRef.current.push(
          new Marker({ element: el }).setLngLat([charger.longitude, charger.latitude]).addTo(map),
        );
      });
    };

    if (map.loaded()) {
      paint();
    } else {
      map.once("load", paint);
    }
  }, [chargers, here.latitude, here.longitude, isLiveLocation, selectedCharger]);

  // Range circle -- redraws whenever the radius or driver location changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const update = () => {
      const source = map.getSource(RANGE_SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) {
        return;
      }
      source.setData(rangeCircleGeoJSON(here.latitude, here.longitude, rangeKm ?? 0));
    };
    if (map.loaded()) {
      update();
    } else {
      map.once("load", update);
    }
  }, [here.latitude, here.longitude, rangeKm]);

  function handleNavigate(charger: Charger) {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${here.latitude},${here.longitude}&destination=${charger.latitude},${charger.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const selectedKm = selectedCharger
    ? haversineKm(here.latitude, here.longitude, selectedCharger.latitude, selectedCharger.longitude)
    : 0;

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />

      {/* Floating Station Details Card when a charger is clicked */}
      {selectedCharger ? (
        <div className="absolute bottom-3 left-3 right-3 z-20 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur text-gray-900 max-w-md mx-auto font-sans">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${selectedCharger.availability !== false ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  {selectedCharger.availability !== false ? "Available Now" : "In Use / Busy"}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 font-mono">
                  {selectedKm.toFixed(1)} km away
                </span>
              </div>
              <h4 className="mt-1 text-[15px] font-bold text-gray-900 leading-tight">
                {selectedCharger.name}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCharger(null)}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2 text-[12px] text-gray-600">
            <div className="flex items-center gap-1.5 font-medium">
              <Zap size={14} className="text-emerald-500" />
              <span>{selectedCharger.power_kw ?? 60} kW Fast Charger</span>
            </div>
            <div className="font-semibold text-gray-900 font-mono">
              ₹{selectedCharger.price_per_kwh ?? 18}/kWh
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavigate(selectedCharger)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-[12px] font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm cursor-pointer"
            >
              <Navigation size={14} />
              <span>Start Navigation</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/driver/charger/${selectedCharger.id}`)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-gray-50 py-2.5 text-[12px] font-bold text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <Calendar size={14} />
              <span>Book Slot</span>
            </button>
          </div>
        </div>
      ) : (
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/95 border border-gray-200 px-3.5 py-1 text-[11px] font-semibold tracking-[0.12em] text-gray-700 shadow backdrop-blur font-mono">
          {chargers.length} CHARGERS NEARBY
        </span>
      )}
    </div>
  );
}
