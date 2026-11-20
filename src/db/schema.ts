import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// Times are milliseconds since the epoch.

/** Members the app has seen, keyed by the Gateway's user id. */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: integer("created_at").notNull(),
});

/** The network, shared by the whole organization and edited by admins. */
export const lines = sqliteTable("lines", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  kind: text("kind").notNull(),
  fromName: text("from_name").notNull(),
  toName: text("to_name").notNull(),
  color: text("color").notNull(),
  createdAt: integer("created_at").notNull(),
});

/** A line's stops; `position` runs 0..n-1 along the line. */
export const stations = sqliteTable(
  "stations",
  {
    id: text("id").primaryKey(),
    lineId: text("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
  },
  (table) => [index("stations_line_idx").on(table.lineId, table.position)],
);

/** A member's starred lines, private to them. */
export const favorites = sqliteTable(
  "favorites",
  {
    userId: text("user_id").notNull(),
    lineId: text("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.lineId] })],
);

/** A member sharing their position while riding a line. */
export const rides = sqliteTable(
  "rides",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    lineId: text("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    startedAt: integer("started_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    endedAt: integer("ended_at"),
  },
  (table) => [index("rides_live_idx").on(table.endedAt, table.lastSeenAt)],
);

/** A problem a member reported on a line, optionally at one of its stations. */
export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    lineId: text("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    stationId: text("station_id").references(() => stations.id, {
      onDelete: "set null",
    }),
    category: text("category").notNull(),
    note: text("note").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: integer("created_at").notNull(),
    resolvedAt: integer("resolved_at"),
  },
  (table) => [index("reports_line_idx").on(table.lineId, table.status)],
);
