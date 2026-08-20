import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map as MapLibreMap, Marker } from "maplibre-gl";

import type { Charger } from "../../types";
import { centroid } from "../../utils/geo";

interface DriverMapProps {
  chargers: Charger[];
  origin?: { latitude: number; longitude: number };
}

const DEFAULT_LIGHT = "https://tiles.openfreemap.org/styles/positron";

export function DriverMap({ chargers, origin }: DriverMapProps) {
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
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [failed, here.latitude, here.longitude, styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || failed) {
      return;
    }
    const paint = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const you = document.createElement("div");
      you.className = "h-3.5 w-3.5 rounded-full bg-[#111417] ring-4 ring-white";
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
  }, [chargers, failed, here.latitude, here.longitude, navigate]);

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
