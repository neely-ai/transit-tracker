import { and, asc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { favorites, lines, reports, rides, stations } from "@/db/schema";
import { LINE_COLORS, LINE_KINDS } from "@/shared/network";

const name = z.string().trim().min(1).max(80);
const id = z.string().min(1).max(64);

export const lineInput = z
  .object({
    code: z.string().trim().min(1, "Give the line a code").max(12),
    kind: z.enum(LINE_KINDS),
    fromName: name,
    toName: name,
    color: z.enum(LINE_COLORS),
  })
  .strict();
export const updateLineInput = lineInput.extend({ id }).strict();
export const idInput = z.object({ id }).strict();
export const stationInput = z
  .object({
    lineId: id,
    name,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();
export const updateStationInput = stationInput
  .omit({ lineId: true })
  .extend({ id })
  .strict();
export const moveStationInput = z
  .object({ id, direction: z.enum(["up", "down"]) })
  .strict();

export interface Station {
  id: string;
  position: number;
  name: string;
  lat: number;
  lng: number;
}

interface LineSummary {
  id: string;
  code: string;
  kind: string;
  fromName: string;
  toName: string;
  color: string;
  stationCount: number;
  favorite: boolean;
}

interface LineWithStations extends LineSummary {
  stations: Station[];
}

const stationColumns = {
  id: stations.id,
  position: stations.position,
  name: stations.name,
  lat: stations.lat,
  lng: stations.lng,
};

/** Every line with its stations, and whether `userId` starred it. */
export async function listNetwork(userId: string): Promise<LineWithStations[]> {
  const [lineRows, stationRows, favoriteRows] = await db.batch([
    db.select().from(lines).orderBy(asc(lines.code)),
    db
      .select({ ...stationColumns, lineId: stations.lineId })
      .from(stations)
      .orderBy(asc(stations.lineId), asc(stations.position)),
    db
      .select({ lineId: favorites.lineId })
      .from(favorites)
      .where(eq(favorites.userId, userId)),
  ]);
  const starred = new Set(favoriteRows.map((row) => row.lineId));
  const byLine = new Map<string, Station[]>();
  for (const { lineId, ...station } of stationRows) {
    const list = byLine.get(lineId) ?? [];
    list.push(station);
    byLine.set(lineId, list);
  }
  return lineRows
    .map((line) => {
      const list = byLine.get(line.id) ?? [];
      return {
        id: line.id,
        code: line.code,
        kind: line.kind,
        fromName: line.fromName,
        toName: line.toName,
        color: line.color,
        stationCount: list.length,
        favorite: starred.has(line.id),
        stations: list,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

export async function getLine(
  userId: string,
  lineId: string,
): Promise<LineWithStations | null> {
  const [lineRows, stationRows, favoriteRows] = await db.batch([
    db.select().from(lines).where(eq(lines.id, lineId)),
    db
      .select(stationColumns)
      .from(stations)
      .where(eq(stations.lineId, lineId))
      .orderBy(asc(stations.position)),
    db
      .select({ lineId: favorites.lineId })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.lineId, lineId))),
  ]);
  const line = lineRows[0];
  if (!line) return null;
  return {
    id: line.id,
    code: line.code,
    kind: line.kind,
    fromName: line.fromName,
    toName: line.toName,
    color: line.color,
    stationCount: stationRows.length,
    favorite: favoriteRows.length > 0,
    stations: stationRows,
  };
}

export async function createLine(input: z.infer<typeof lineInput>) {
  const [line] = await db
    .insert(lines)
    .values({ id: crypto.randomUUID(), ...input, createdAt: Date.now() })
    .returning({ id: lines.id });
  return line!;
}

export async function updateLine({
  id: lineId,
  ...change
}: z.infer<typeof updateLineInput>) {
  const [line] = await db
    .update(lines)
    .set(change)
    .where(eq(lines.id, lineId))
    .returning({ id: lines.id });
  return line ?? null;
}

/** Deletes the line with everything hanging off it, in one batch. */
export async function deleteLine(lineId: string) {
  await db.batch([
    db.delete(reports).where(eq(reports.lineId, lineId)),
    db.delete(rides).where(eq(rides.lineId, lineId)),
    db.delete(favorites).where(eq(favorites.lineId, lineId)),
    db.delete(stations).where(eq(stations.lineId, lineId)),
    db.delete(lines).where(eq(lines.id, lineId)),
  ]);
}

/** Adds a station at the end of its line. */
export async function addStation(input: z.infer<typeof stationInput>) {
  const stationId = crypto.randomUUID();
  const result = await db.run(sql`
    INSERT INTO stations (id, line_id, position, name, lat, lng)
    SELECT ${stationId}, ${input.lineId},
      (SELECT COALESCE(MAX(position) + 1, 0) FROM stations WHERE line_id = ${input.lineId}),
      ${input.name}, ${input.lat}, ${input.lng}
    WHERE EXISTS (SELECT 1 FROM lines WHERE id = ${input.lineId})`);
  return changed(result) ? { id: stationId } : null;
}

export async function updateStation({
  id: stationId,
  ...change
}: z.infer<typeof updateStationInput>) {
  const [station] = await db
    .update(stations)
    .set(change)
    .where(eq(stations.id, stationId))
    .returning({ id: stations.id });
  return station ?? null;
}

/** Swaps a station with its neighbour; the order stays 0..n-1. */
export async function moveStation({
  id: stationId,
  direction,
}: z.infer<typeof moveStationInput>) {
  const [station] = await db
    .select({ lineId: stations.lineId, position: stations.position })
    .from(stations)
    .where(eq(stations.id, stationId));
  if (!station) return null;
  const target = station.position + (direction === "up" ? -1 : 1);
  const [neighbour] = await db
    .select({ id: stations.id })
    .from(stations)
    .where(
      and(eq(stations.lineId, station.lineId), eq(stations.position, target)),
    );
  if (!neighbour) return { id: stationId };
  await db.batch([
    db
      .update(stations)
      .set({ position: station.position })
      .where(eq(stations.id, neighbour.id)),
    db
      .update(stations)
      .set({ position: target })
      .where(eq(stations.id, stationId)),
  ]);
  return { id: stationId };
}

/** Deletes a station and closes the gap it leaves in the order. */
export async function deleteStation(stationId: string) {
  const [station] = await db
    .select({ lineId: stations.lineId, position: stations.position })
    .from(stations)
    .where(eq(stations.id, stationId));
  if (!station) return null;
  await db.batch([
    db.delete(stations).where(eq(stations.id, stationId)),
    db
      .update(stations)
      .set({ position: sql`${stations.position} - 1` })
      .where(
        and(
          eq(stations.lineId, station.lineId),
          gt(stations.position, station.position),
        ),
      ),
  ]);
  return { id: stationId };
}

function changed(result: unknown) {
  const meta = (result as { meta?: { changes?: number } }).meta;
  const rowsAffected = (result as { rowsAffected?: number }).rowsAffected;
  return (meta?.changes ?? rowsAffected ?? 0) > 0;
}
