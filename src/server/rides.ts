import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lines, rides } from "@/db/schema";
import { RIDE_TIMEOUT_MS } from "@/shared/network";

const position = {
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
};
export const startRideInput = z
  .object({ lineId: z.string().min(1).max(64), ...position })
  .strict();
export const positionInput = z
  .object({ rideId: z.string().uuid(), ...position })
  .strict();
export const stopRideInput = z.object({ rideId: z.string().uuid() }).strict();

export interface Vehicle {
  key: string;
  lineId: string;
  lat: number;
  lng: number;
  riders: number;
}

export interface LiveState {
  vehicles: Vehicle[];
  riders: number;
}

/** Riders on the same line closer than this count as one vehicle. */
const SAME_VEHICLE_METERS = 300;

/** Starts a ride for `userId`, ending any ride they left running. */
export async function startRide(
  userId: string,
  input: z.infer<typeof startRideInput>,
) {
  const [line] = await db
    .select({ id: lines.id })
    .from(lines)
    .where(eq(lines.id, input.lineId));
  if (!line) throw new Error("That line no longer exists.");
  const now = Date.now();
  const rideId = crypto.randomUUID();
  await db.batch([
    db
      .update(rides)
      .set({ endedAt: now })
      .where(and(eq(rides.userId, userId), isNull(rides.endedAt))),
    db.insert(rides).values({
      id: rideId,
      userId,
      lineId: input.lineId,
      lat: input.lat,
      lng: input.lng,
      startedAt: now,
      lastSeenAt: now,
    }),
  ]);
  return { rideId };
}

/** Moves the caller's own running ride; false for anyone else's. */
export async function updatePosition(
  userId: string,
  { rideId, lat, lng }: z.infer<typeof positionInput>,
) {
  const moved = await db
    .update(rides)
    .set({ lat, lng, lastSeenAt: Date.now() })
    .where(
      and(
        eq(rides.id, rideId),
        eq(rides.userId, userId),
        isNull(rides.endedAt),
      ),
    )
    .returning({ id: rides.id });
  return moved.length > 0;
}

export async function stopRide(
  userId: string,
  { rideId }: z.infer<typeof stopRideInput>,
) {
  const stopped = await db
    .update(rides)
    .set({ endedAt: Date.now() })
    .where(
      and(
        eq(rides.id, rideId),
        eq(rides.userId, userId),
        isNull(rides.endedAt),
      ),
    )
    .returning({ id: rides.id });
  return stopped.length > 0;
}

/** The caller's running ride, if any. */
export async function currentRide(userId: string) {
  const [ride] = await db
    .select({ rideId: rides.id, lineId: rides.lineId })
    .from(rides)
    .where(
      and(
        eq(rides.userId, userId),
        isNull(rides.endedAt),
        gt(rides.lastSeenAt, Date.now() - RIDE_TIMEOUT_MS),
      ),
    );
  return ride ?? null;
}

/** Live rides grouped into vehicles. Riders are never named. */
export async function liveState(now = Date.now()): Promise<LiveState> {
  const live = await db
    .select({ lineId: rides.lineId, lat: rides.lat, lng: rides.lng })
    .from(rides)
    .where(
      and(isNull(rides.endedAt), gt(rides.lastSeenAt, now - RIDE_TIMEOUT_MS)),
    );
  return { vehicles: groupVehicles(live), riders: live.length };
}

function groupVehicles(
  live: { lineId: string; lat: number; lng: number }[],
): Vehicle[] {
  const vehicles: Vehicle[] = [];
  for (const ride of live) {
    const near = vehicles.find(
      (vehicle) =>
        vehicle.lineId === ride.lineId &&
        meters(vehicle, ride) < SAME_VEHICLE_METERS,
    );
    if (near) {
      near.lat = (near.lat * near.riders + ride.lat) / (near.riders + 1);
      near.lng = (near.lng * near.riders + ride.lng) / (near.riders + 1);
      near.riders += 1;
    } else {
      vehicles.push({
        key: `${ride.lineId}-${vehicles.length}`,
        ...ride,
        riders: 1,
      });
    }
  }
  return vehicles;
}

function meters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
