import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { MAX_FAVORITES } from "@/shared/network";

export const favoriteInput = z
  .object({ lineId: z.string().min(1).max(64), starred: z.boolean() })
  .strict();

export class FavoriteLimitError extends Error {
  constructor() {
    super(`You can star up to ${MAX_FAVORITES} lines.`);
  }
}

/** Stars or unstars a line for `userId` alone; a sixth star is refused. */
export async function setFavorite(
  userId: string,
  { lineId, starred }: z.infer<typeof favoriteInput>,
) {
  if (!starred) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.lineId, lineId)));
    return { starred: false };
  }
  // One statement, so two quick clicks can't get past the limit.
  const result = await db.run(sql`
    INSERT INTO favorites (user_id, line_id, created_at)
    SELECT ${userId}, ${lineId}, ${Date.now()}
    WHERE EXISTS (SELECT 1 FROM lines WHERE id = ${lineId})
      AND (SELECT COUNT(*) FROM favorites WHERE user_id = ${userId}) < ${MAX_FAVORITES}
    ON CONFLICT DO NOTHING`);
  const changes =
    (result as { meta?: { changes?: number } }).meta?.changes ??
    (result as { rowsAffected?: number }).rowsAffected ??
    0;
  if (changes > 0) return { starred: true };
  const [existing] = await db
    .select({ lineId: favorites.lineId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.lineId, lineId)));
  if (existing) return { starred: true };
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(favorites)
    .where(eq(favorites.userId, userId));
  if (count >= MAX_FAVORITES) throw new FavoriteLimitError();
  throw new Error("That line no longer exists.");
}
