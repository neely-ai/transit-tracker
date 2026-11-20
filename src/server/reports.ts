import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lines, reports, stations } from "@/db/schema";
import { REPORT_CATEGORIES } from "@/shared/network";

const id = z.string().min(1).max(64);

export const createReportInput = z
  .object({
    lineId: id,
    stationId: id.nullable(),
    category: z.enum(REPORT_CATEGORIES),
    note: z.string().trim().min(1, "Add a short note").max(280),
  })
  .strict();
export const reportFilterInput = z
  .object({
    lineId: id.optional(),
    status: z.enum(["open", "resolved"]).optional(),
  })
  .strict();
export const reportIdInput = z.object({ id: z.string().uuid() }).strict();

export interface Report {
  id: string;
  lineId: string;
  lineCode: string;
  lineColor: string;
  stationName: string | null;
  lat: number | null;
  lng: number | null;
  category: string;
  note: string;
  status: string;
  createdAt: number;
  mine: boolean;
}

export async function createReport(
  userId: string,
  input: z.infer<typeof createReportInput>,
) {
  const [line] = await db
    .select({ id: lines.id })
    .from(lines)
    .where(eq(lines.id, input.lineId));
  if (!line) throw new Error("That line no longer exists.");
  if (input.stationId) {
    const [station] = await db
      .select({ id: stations.id })
      .from(stations)
      .where(
        and(
          eq(stations.id, input.stationId),
          eq(stations.lineId, input.lineId),
        ),
      );
    if (!station) throw new Error("That station isn't on this line.");
  }
  const [report] = await db
    .insert(reports)
    .values({
      id: crypto.randomUUID(),
      userId,
      ...input,
      status: "open",
      createdAt: Date.now(),
    })
    .returning({ id: reports.id });
  return report!;
}

/** Every member sees every report; `mine` marks the caller's own. */
export async function listReports(
  userId: string,
  filter: z.infer<typeof reportFilterInput>,
): Promise<Report[]> {
  const where: SQL[] = [];
  if (filter.lineId) where.push(eq(reports.lineId, filter.lineId));
  if (filter.status) where.push(eq(reports.status, filter.status));
  return db
    .select({
      id: reports.id,
      lineId: reports.lineId,
      lineCode: lines.code,
      lineColor: lines.color,
      stationName: stations.name,
      lat: stations.lat,
      lng: stations.lng,
      category: reports.category,
      note: reports.note,
      status: reports.status,
      createdAt: reports.createdAt,
      mine: sql<boolean>`${reports.userId} = ${userId}`.mapWith(Boolean),
    })
    .from(reports)
    .innerJoin(lines, eq(lines.id, reports.lineId))
    .leftJoin(stations, eq(stations.id, reports.stationId))
    .where(and(...where))
    .orderBy(desc(reports.createdAt));
}

/** Deletes a report its author owns, or any report for an admin. */
export async function deleteReport(
  user: { id: string; admin: boolean },
  { id: reportId }: z.infer<typeof reportIdInput>,
) {
  const owned = user.admin ? undefined : eq(reports.userId, user.id);
  const deleted = await db
    .delete(reports)
    .where(and(eq(reports.id, reportId), owned))
    .returning({ id: reports.id });
  return deleted.length > 0;
}

export async function resolveReport({
  id: reportId,
}: z.infer<typeof reportIdInput>) {
  const resolved = await db
    .update(reports)
    .set({ status: "resolved", resolvedAt: Date.now() })
    .where(and(eq(reports.id, reportId), eq(reports.status, "open")))
    .returning({ id: reports.id });
  return resolved.length > 0;
}
