// Route finding over the network's ordered station lists.

interface TripLine {
  id: string;
  code: string;
  stations: { name: string }[];
}

export interface TripLeg {
  lineId: string;
  code: string;
  from: string;
  to: string;
  stops: number;
}

export interface TripRoute {
  legs: TripLeg[];
  stops: number;
  change: string | null;
}

const MAX_RESULTS = 10;

function indexOf(line: TripLine, name: string, after = -1) {
  return line.stations.findIndex(
    (station, index) => index > after && station.name === name,
  );
}

/**
 * Direct lines that reach `from` before `to`; when there are none, routes
 * with one change at a station two lines share. Fewest stops first.
 */
export function planTrip(
  network: TripLine[],
  from: string,
  to: string,
): TripRoute[] {
  if (from === to) return [];
  const direct: TripRoute[] = [];
  for (const line of network) {
    const start = indexOf(line, from);
    if (start < 0) continue;
    const end = indexOf(line, to, start);
    if (end < 0) continue;
    const stops = end - start;
    direct.push({
      legs: [{ lineId: line.id, code: line.code, from, to, stops }],
      stops,
      change: null,
    });
  }
  if (direct.length) return sortRoutes(direct);

  const best = new Map<string, TripRoute>();
  for (const first of network) {
    const start = indexOf(first, from);
    if (start < 0) continue;
    for (let k = start + 1; k < first.stations.length; k++) {
      const change = first.stations[k]!.name;
      if (change === to || change === from) continue;
      for (const second of network) {
        if (second.id === first.id) continue;
        const board = indexOf(second, change);
        if (board < 0) continue;
        const end = indexOf(second, to, board);
        if (end < 0) continue;
        const legs: TripLeg[] = [
          {
            lineId: first.id,
            code: first.code,
            from,
            to: change,
            stops: k - start,
          },
          {
            lineId: second.id,
            code: second.code,
            from: change,
            to,
            stops: end - board,
          },
        ];
        const route = { legs, stops: legs[0]!.stops + legs[1]!.stops, change };
        const key = `${first.id}|${second.id}|${change}`;
        const seen = best.get(key);
        if (!seen || seen.stops > route.stops) best.set(key, route);
      }
    }
  }
  return sortRoutes([...best.values()]);
}

function sortRoutes(routes: TripRoute[]) {
  return routes
    .sort(
      (a, b) =>
        a.stops - b.stops ||
        a.legs[0]!.code.localeCompare(b.legs[0]!.code, undefined, {
          numeric: true,
        }),
    )
    .slice(0, MAX_RESULTS);
}
