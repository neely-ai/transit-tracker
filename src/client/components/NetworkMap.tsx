import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { resolveColor, resolveToken } from "@/client/components/LineBadge";

// Map tiles: OpenStreetMap's public tile server.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface MapLine {
  id: string;
  color: string;
  stations: { lat: number; lng: number }[];
}

interface MapPoint {
  key: string;
  lineId?: string;
  color?: string;
  lat: number;
  lng: number;
}

/**
 * Lines as coloured paths, with optional station dots, vehicles and report
 * pins. Leaflet loads in the browser only.
 */
export function NetworkMap({
  lines,
  vehicles = [],
  reports = [],
  showStations = false,
  testId,
}: {
  lines: MapLine[];
  vehicles?: MapPoint[];
  reports?: MapPoint[];
  showStations?: boolean;
  testId: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<{
    L: typeof Leaflet;
    map: Leaflet.Map;
    layer: Leaflet.LayerGroup;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: Leaflet.Map | null = null;
    void import("leaflet").then((module) => {
      const L = (module.default ?? module) as typeof Leaflet;
      if (cancelled || !element.current) return;
      created = L.map(element.current, { scrollWheelZoom: false });
      created.setView([20, 0], 2);
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(
        created,
      );
      setMap({ L, map: created, layer: L.layerGroup().addTo(created) });
    });
    return () => {
      cancelled = true;
      created?.remove();
    };
  }, []);

  // Fit the view when the set of lines shown changes, not on every vehicle.
  const shown = lines.map((line) => line.id).join(",");
  useEffect(() => {
    if (!map) return;
    const points = lines.flatMap((line) =>
      line.stations.map(
        (station) => [station.lat, station.lng] as [number, number],
      ),
    );
    if (points.length === 1) map.map.setView(points[0]!, 14);
    else if (points.length > 1)
      map.map.fitBounds(map.L.latLngBounds(points), { padding: [24, 24] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, shown]);

  useEffect(() => {
    if (!map) return;
    const { L, layer } = map;
    layer.clearLayers();
    const background = resolveToken("--background");
    const colors = new Map(
      lines.map((line) => [line.id, resolveColor(line.color)]),
    );
    for (const line of lines) {
      const color = colors.get(line.id)!;
      const path = line.stations.map((s) => [s.lat, s.lng] as [number, number]);
      if (path.length > 1) {
        L.polyline(path, { color, weight: 5, opacity: 0.85 }).addTo(layer);
      }
      if (showStations) {
        for (const point of path) {
          L.circleMarker(point, {
            radius: 5,
            color,
            weight: 2,
            fillColor: background,
            fillOpacity: 1,
            interactive: false,
          }).addTo(layer);
        }
      }
    }
    const warning = resolveToken("--warning");
    for (const report of reports) {
      L.circleMarker([report.lat, report.lng], {
        radius: 7,
        color: warning,
        weight: 3,
        dashArray: "3 3",
        fill: false,
        interactive: false,
      }).addTo(layer);
    }
    for (const vehicle of vehicles) {
      L.circleMarker([vehicle.lat, vehicle.lng], {
        radius: 9,
        color: background,
        weight: 3,
        fillColor: colors.get(vehicle.lineId ?? "") ?? resolveColor(""),
        fillOpacity: 1,
        interactive: false,
      }).addTo(layer);
    }
  }, [map, lines, vehicles, reports, showStations]);

  return (
    <div
      ref={element}
      data-testid={testId}
      className="isolate z-0 h-80 w-full overflow-hidden rounded-xl border border-border bg-muted md:h-[28rem]"
    />
  );
}
