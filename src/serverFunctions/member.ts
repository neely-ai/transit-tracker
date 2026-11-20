import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as favorites from "@/server/favorites";
import { publishLive } from "@/server/live";
import { listNetwork } from "@/server/network";
import * as reports from "@/server/reports";
import * as rides from "@/server/rides";
import { planTrip } from "@/server/trip";
import { memberMiddleware } from "@/serverFunctions/auth";

export const setFavorite = createServerFn({ method: "POST" })
  .middleware([memberMiddleware])
  .validator((data: unknown) => favorites.favoriteInput.parse(data))
  .handler(({ data, context }) =>
    favorites.setFavorite(context.member.id, data),
  );

export const findTrip = createServerFn()
  .middleware([memberMiddleware])
  .validator((data: unknown) =>
    z
      .object({
        from: z.string().min(1).max(80),
        to: z.string().min(1).max(80),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data, context }) =>
    planTrip(await listNetwork(context.member.id), data.from, data.to),
  );

export const getLive = createServerFn()
  .middleware([memberMiddleware])
  .handler(async ({ context }) => ({
    ...(await rides.liveState()),
    myRide: await rides.currentRide(context.member.id),
  }));

export const startRide = createServerFn({ method: "POST" })
  .middleware([memberMiddleware])
  .validator((data: unknown) => rides.startRideInput.parse(data))
  .handler(async ({ data, context }) => {
    const ride = await rides.startRide(context.member.id, data);
    await publishLive();
    return ride;
  });

export const sendPosition = createServerFn({ method: "POST" })
  .middleware([memberMiddleware])
  .validator((data: unknown) => rides.positionInput.parse(data))
  .handler(async ({ data, context }) => {
    const moved = await rides.updatePosition(context.member.id, data);
    if (moved) await publishLive();
    return { live: moved };
  });

export const stopRide = createServerFn({ method: "POST" })
  .middleware([memberMiddleware])
  .validator((data: unknown) => rides.stopRideInput.parse(data))
  .handler(async ({ data, context }) => {
    if (await rides.stopRide(context.member.id, data)) await publishLive();
  });

export const getReports = createServerFn()
  .middleware([memberMiddleware])
  .validator((data: unknown) => reports.reportFilterInput.parse(data ?? {}))
  .handler(async ({ data, context }) => ({
    reports: await reports.listReports(context.member.id, data),
    admin: context.member.admin,
  }));

export const createReport = createServerFn({ method: "POST" })
  .middleware([memberMiddleware])
  .validator((data: unknown) => reports.createReportInput.parse(data))
  .handler(({ data, context }) =>
    reports.createReport(context.member.id, data),
  );

export const deleteReport = createServerFn({ method: "POST" })
  .middleware([memberMiddleware])
  .validator((data: unknown) => reports.reportIdInput.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await reports.deleteReport(context.member, data)))
      throw new Error("You can delete only your own reports.");
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([memberMiddleware])
  .validator((data: unknown) => reports.reportIdInput.parse(data))
  .handler(async ({ data, context }) => {
    if (!context.member.admin)
      throw new Error("Only admins can resolve reports.");
    if (!(await reports.resolveReport(data)))
      throw new Error("Report not found.");
  });
