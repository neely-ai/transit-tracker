import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as network from "@/server/network";
import { publishLive } from "@/server/live";
import { adminMiddleware, memberMiddleware } from "@/serverFunctions/auth";

export const getNetwork = createServerFn()
  .middleware([memberMiddleware])
  .handler(async ({ context }) => ({
    lines: await network.listNetwork(context.member.id),
    admin: context.member.admin,
  }));

export const getLine = createServerFn()
  .middleware([memberMiddleware])
  .validator((data: unknown) => z.string().min(1).max(64).parse(data))
  .handler(async ({ data, context }) => ({
    line: await network.getLine(context.member.id, data),
    admin: context.member.admin,
  }));

export const getViewer = createServerFn()
  .middleware([memberMiddleware])
  .handler(({ context }) => ({ admin: context.member.admin }));

export const createLine = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: unknown) => network.lineInput.parse(data))
  .handler(({ data }) => network.createLine(data));

export const updateLine = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: unknown) => network.updateLineInput.parse(data))
  .handler(async ({ data }) => {
    if (!(await network.updateLine(data))) throw new Error("Line not found.");
  });

export const deleteLine = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: unknown) => network.idInput.parse(data))
  .handler(async ({ data }) => {
    await network.deleteLine(data.id);
    await publishLive();
  });

export const addStation = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: unknown) => network.stationInput.parse(data))
  .handler(async ({ data }) => {
    if (!(await network.addStation(data))) throw new Error("Line not found.");
  });

export const updateStation = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: unknown) => network.updateStationInput.parse(data))
  .handler(async ({ data }) => {
    if (!(await network.updateStation(data)))
      throw new Error("Station not found.");
  });

export const moveStation = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: unknown) => network.moveStationInput.parse(data))
  .handler(async ({ data }) => {
    if (!(await network.moveStation(data)))
      throw new Error("Station not found.");
  });

export const deleteStation = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: unknown) => network.idInput.parse(data))
  .handler(async ({ data }) => {
    if (!(await network.deleteStation(data.id)))
      throw new Error("Station not found.");
  });
