import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

// An in-memory SQLite with the app's migrations stands in for D1.
const testDb = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { setFavorite, FavoriteLimitError } = await import("./favorites");
const { createReport, deleteReport } = await import("./reports");

beforeAll(async () => {
  const db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  });
  for (let i = 1; i <= 6; i++) {
    await db.insert(schema.lines).values({
      id: `l${i}`,
      code: `${i}`,
      kind: "bus",
      fromName: "A",
      toName: "B",
      color: "blue",
      createdAt: 0,
    });
  }
  testDb.current = db;
});

describe("favourites", () => {
  it("stop at five per member and stay per member", async () => {
    for (let i = 1; i <= 5; i++) {
      await setFavorite("alice", { lineId: `l${i}`, starred: true });
    }
    await expect(
      setFavorite("alice", { lineId: "l6", starred: true }),
    ).rejects.toBeInstanceOf(FavoriteLimitError);
    expect(await setFavorite("bob", { lineId: "l6", starred: true })).toEqual({
      starred: true,
    });
  });
});

describe("reports", () => {
  it("are deleted only by their author or an admin", async () => {
    const report = await createReport("alice", {
      lineId: "l1",
      stationId: null,
      category: "delay",
      note: "Late",
    });
    expect(await deleteReport({ id: "bob", admin: false }, report)).toBe(false);
    expect(await deleteReport({ id: "carol", admin: true }, report)).toBe(true);
  });
});
