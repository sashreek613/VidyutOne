import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";

import type { Charger } from "../../types";
import { centroid } from "../../utils/geo";

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

const DEFAULT_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const RANGE_SOURCE_ID = "driver-range-circle";
const EARTH_KM = 6371;

/** No turf dependency -- a plain-math circle polygon is ~10 lines and this
 * is the only place that needs one. */
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

// Minimal local shape (not the full geojson type package) -- this is the
// only GeoJSON this file ever produces.
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
  const [failed, setFailed] = useState(false);
  const here = origin ?? centroid(chargers);
  const styleUrl = import.meta.env.VITE_MAP_STYLE_LIGHT ?? DEFAULT_LIGHT;

  useEffect(() => {
    if (!ref.current || failed) {
      return;
    }
    const map = new MapLibreMap({
      container: ref.current,
      style: styleUrl,
      center: [here.longitude, here.latitude],
      zoom: 11.4,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.on("error", () => setFailed(true));
    map.on("load", () => {
      map.addSource(RANGE_SOURCE_ID, {
        type: "geojson",
        data: rangeCircleGeoJSON(here.latitude, here.longitude, 0),
      });
      map.addLayer({
        id: `${RANGE_SOURCE_ID}-fill`,
        type: "fill",
        source: RANGE_SOURCE_ID,
        paint: { "fill-color": "#00e8a2", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: `${RANGE_SOURCE_ID}-line`,
        type: "line",
        source: RANGE_SOURCE_ID,
        paint: { "line-color": "#00e8a2", "line-width": 1.5, "line-opacity": 0.5 },
      });
    });
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [failed, here.latitude, here.longitude, styleUrl]);

  // Markers -- driver location + candidate chargers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || failed) {
      return;
    }
    const paint = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const you = document.createElement("div");
      // The pulsing ring is the map's own confirmation of live location --
      // exists only when isLiveLocation is true, never for a centroid/
      // fallback origin, so the map can't visually claim GPS it doesn't have.
      you.className = "relative flex h-3.5 w-3.5 items-center justify-center";
      you.innerHTML = isLiveLocation
        ? '<span class="absolute h-7 w-7 rounded-full bg-emerald-400/40 animate-ping"></span><span class="relative h-3.5 w-3.5 rounded-full bg-[#111417] ring-4 ring-white"></span>'
        : '<span class="h-3.5 w-3.5 rounded-full bg-[#111417] ring-4 ring-white"></span>';
      markersRef.current.push(new Marker({ element: you }).setLngLat([here.longitude, here.latitude]).addTo(map));

      chargers.forEach((charger) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = charger.availability
          ? "h-3 w-3 rounded-full bg-[#00e8a2] ring-2 ring-white"
          : "h-3 w-3 rounded-full bg-[#f0b429] ring-2 ring-white";
        el.addEventListener("click", () => {
          void navigate(`/driver/charger/${charger.id}`);
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
  }, [chargers, failed, here.latitude, here.longitude, isLiveLocation, navigate]);

  // Range circle -- redraws whenever the radius or driver location changes.
  // No circle at all when rangeKm is null/undefined (no vehicle selected).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || failed) {
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
  }, [failed, here.latitude, here.longitude, rangeKm]);

  if (failed) {
    return (
      <div className="flex h-full items-end justify-center bg-[#e7ebe8] vo-radar">
        <span className="mb-3 rounded-full bg-white px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-driver-ink">
          {chargers.length} CHARGERS NEARBY
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-driver-ink shadow">
        {chargers.length} CHARGERS NEARBY
      </span>
    </div>
  );
}
