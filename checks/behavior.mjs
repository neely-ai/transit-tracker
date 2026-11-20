import {
  startRuntime,
  expect,
} from "/home/user/oss-new/control/runtime/index.mjs";
import { seedNetwork, rows, pick, LOCATION } from "./lib.mjs";

const runtime = await startRuntime();
try {
  await seedNetwork(runtime);
  const geo = { geolocation: LOCATION, permissions: ["geolocation"] };

  // Server route: the live channel needs a WebSocket upgrade.
  const plain = await runtime.fetch("/api/live", { role: "member" });
  expect(plain.status).toBe(426);
  const health = await runtime.fetch("/health", { role: "member" });
  expect(health.status).toBe(200);

  const owner = await (await runtime.context("owner", geo)).newPage();
  const member = await (await runtime.context("member", geo)).newPage();

  // F001: browse, search, filter.
  await member.goto("/lines");
  await expect(member.getByTestId("line-row")).toHaveCount(6);
  await expect(member.getByTestId("new-line")).toHaveCount(0);
  await expect(
    member.getByTestId("line-row").filter({ hasText: "36B" }),
  ).toContainText("5 stations");
  await member.getByTestId("line-search").fill("harbour");
  await expect(member.getByTestId("line-row")).toHaveCount(1);
  await expect(member.getByTestId("line-row").first()).toContainText(
    "Harbour Gate – Northfield",
  );
  await member.getByTestId("line-search").fill("");
  await pick(member, "kind-filter", "Metro");
  await expect(member.getByTestId("line-row")).toHaveCount(1);
  await expect(member.getByTestId("line-row").first()).toContainText("M1");
  await pick(member, "kind-filter", "All kinds");
  await member
    .getByTestId("line-row")
    .filter({ hasText: "36B" })
    .getByRole("link", { name: "36B" })
    .click();
  await expect(member.getByRole("heading", { level: 1 })).toContainText("36B");
  await expect(member.getByTestId("station-row")).toHaveText([
    /Harbour Gate/,
    /Market Square/,
    /Central Station/,
    /University/,
    /Northfield/,
  ]);
  await expect(
    member.locator('[data-testid="line-map"] path.leaflet-interactive').first(),
  ).toBeVisible();
  await expect(member.getByTestId("station-add")).toHaveCount(0);

  // F001: an admin builds a line, edits its stations and deletes it.
  await owner.goto("/lines");
  await owner.getByTestId("new-line").click();
  await owner.getByTestId("line-code").fill("9X");
  await pick(owner, "line-kind", "Bus");
  await owner.getByTestId("line-from").fill("Depot");
  await owner.getByTestId("line-to").fill("Seaside");
  await owner.getByTestId("color-green").click();
  await owner.getByTestId("line-save").click();
  await expect(owner.getByRole("heading", { level: 1 })).toContainText("9X");
  for (const [name, lat, lng] of [
    ["Depot", "36.79", "10.15"],
    ["Seaside", "36.78", "10.22"],
    ["Clock Tower", "36.785", "10.18"],
  ]) {
    await owner.getByTestId("station-name").fill(name);
    await owner.getByTestId("station-lat").fill(lat);
    await owner.getByTestId("station-lng").fill(lng);
    await owner.getByTestId("station-add").click();
    await expect(
      owner.getByTestId("station-row").filter({ hasText: name }),
    ).toBeVisible();
  }
  await owner.getByRole("button", { name: "Move Clock Tower up" }).click();
  await expect(owner.getByTestId("station-row")).toHaveText([
    /Depot/,
    /Clock Tower/,
    /Seaside/,
  ]);
  await owner.getByRole("button", { name: "Edit Seaside" }).click();
  await owner.getByTestId("edit-station-name").fill("Seaside Terminal");
  await owner.getByTestId("station-save").click();
  await expect(owner.getByTestId("station-row")).toHaveText([
    /Depot/,
    /Clock Tower/,
    /Seaside Terminal/,
  ]);
  await owner.getByRole("button", { name: "Delete Clock Tower" }).click();
  await owner
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(owner.getByTestId("station-row")).toHaveText([
    /Depot/,
    /Seaside Terminal/,
  ]);
  await owner.getByTestId("line-delete").click();
  await owner
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete line" })
    .click();
  await expect(owner).toHaveURL(/\/lines$/);
  await expect(owner.getByTestId("line-row")).toHaveCount(6);
  expect(
    await rows(runtime, "SELECT id FROM stations WHERE name = 'Depot'"),
  ).toHaveLength(0);

  // F002: five favourites, a sixth is refused, and the "My lines" view.
  await member.goto("/lines");
  for (const code of ["36B", "M1", "L4", "R2", "20"]) {
    await member.getByTestId(`star-${code}`).click();
    await expect(member.getByTestId(`star-${code}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  await member.getByTestId("star-71").click();
  await expect(member.getByText("You can star up to 5 lines.")).toBeVisible();
  await expect(member.getByTestId("star-71")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await member.getByTestId("scope-mine").click();
  await expect(member.getByTestId("line-row")).toHaveCount(5);
  await member.getByTestId("star-20").click();
  await expect(member.getByTestId("line-row")).toHaveCount(4);
  await owner.goto("/lines");
  await owner.getByTestId("scope-mine").click();
  await expect(owner.getByTestId("line-row")).toHaveCount(0);

  // F004: direct routes, one change, and nothing.
  await member.goto("/trip");
  await pick(member, "trip-from", "Harbour Gate");
  await pick(member, "trip-to", "University");
  await member.getByTestId("trip-search").click();
  await expect(member.getByTestId("trip-result")).toHaveCount(1);
  await expect(member.getByTestId("trip-result").first()).toContainText("36B");
  await expect(member.getByTestId("trip-result").first()).toContainText(
    "3 stops",
  );
  await pick(member, "trip-to", "Airport");
  await member.getByTestId("trip-search").click();
  const change = member.getByTestId("trip-result").first();
  await expect(change).toContainText("Central Station");
  await expect(change).toContainText("5 stops");
  await expect(change.getByRole("link", { name: "36B" })).toBeVisible();
  await expect(change.getByRole("link", { name: "M1" })).toBeVisible();
  await pick(member, "trip-to", "Hill Village");
  await member.getByTestId("trip-search").click();
  await expect(member.getByTestId("trip-empty")).toBeVisible();
  await expect(member.getByTestId("trip-result")).toHaveCount(0);

  // F005: report, list, filter, resolve, delete.
  await member.goto("/lines/line-36b");
  await member.getByTestId("report-open").click();
  await pick(member, "report-category", "Crowded");
  await pick(member, "report-station", "Market Square");
  await member
    .getByTestId("report-note")
    .fill("Standing room only after the school run");
  await member.getByTestId("report-submit").click();
  await expect(
    member.getByTestId("report-row").filter({ hasText: "Standing room only" }),
  ).toContainText("Market Square");
  await member.goto("/lines/line-m1");
  await member.getByTestId("report-open").click();
  await pick(member, "report-category", "Delay");
  await member
    .getByTestId("report-note")
    .fill("Signal fault, trains held about ten minutes");
  await member.getByTestId("report-submit").click();
  await expect(
    member.getByTestId("report-row").filter({ hasText: "Signal fault" }),
  ).toBeVisible();
  await member.goto("/reports");
  await expect(member.getByTestId("report-row")).toHaveCount(2);
  await pick(member, "report-line-filter", /^M1/);
  await expect(member.getByTestId("report-row")).toHaveCount(1);
  await expect(member.getByTestId("report-row").first()).toContainText(
    "Signal fault",
  );
  await expect(member.getByTestId("report-resolve")).toHaveCount(0);
  await owner.goto("/reports");
  await owner
    .getByTestId("report-row")
    .filter({ hasText: "Signal fault" })
    .getByTestId("report-resolve")
    .click();
  await expect(
    owner.getByTestId("report-row").filter({ hasText: "Signal fault" }),
  ).toContainText("Resolved");
  await pick(owner, "report-status-filter", "Open");
  await expect(owner.getByTestId("report-row")).toHaveCount(1);
  await pick(owner, "report-status-filter", "Resolved");
  await expect(owner.getByTestId("report-row")).toHaveCount(1);
  await expect(owner.getByTestId("report-row").first()).toContainText(
    "Signal fault",
  );
  await member.goto("/reports");
  await pick(member, "report-status-filter", "All statuses");
  await member
    .getByTestId("report-row")
    .filter({ hasText: "Signal fault" })
    .getByTestId("report-delete")
    .click();
  await member
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(member.getByTestId("report-row")).toHaveCount(1);

  // F003: location prompt without permission.
  const noGeo = await (await runtime.context("member")).newPage();
  await noGeo.goto("/");
  await expect(noGeo.getByTestId("location-prompt")).toBeVisible();
  await expect(noGeo.getByTestId("share-start")).toBeDisabled();
  await noGeo.close();

  // F003: a stale ride never shows.
  const stale = Date.now() - 3 * 60 * 1000;
  await (await runtime.database())
    .prepare(
      "INSERT INTO rides (id, user_id, line_id, lat, lng, started_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind("stale-ride", "someone-else", "line-r2", 36.78, 10.25, stale, stale)
    .run();

  // F003: the live map, with every line and the open reports.
  await owner.goto("/");
  await expect(owner.getByTestId("map-line")).toHaveCount(6);
  await expect(
    owner.locator('[data-testid="live-map"] path.leaflet-interactive'),
  ).toHaveCount(6);
  await expect(owner.getByTestId("map-report")).toHaveCount(1);
  await expect(owner.getByTestId("stat-riders")).toContainText("0 on board");
  await pick(owner, "isolate-line", /^M1/);
  await expect(
    owner.locator('[data-testid="live-map"] path.leaflet-interactive'),
  ).toHaveCount(1);
  await pick(owner, "isolate-line", "Every line");
  await member.goto("/");
  await expect(owner.getByTestId("stat-viewers")).toContainText("2 viewing");
  await member.getByTestId("scope-mine").click();
  await expect(member.getByTestId("map-line")).toHaveCount(4);
  await member.getByTestId("scope-all").click();

  // F003: share a ride; everyone sees it live, then it stops.
  await pick(member, "share-line", /^36B/);
  await member.getByTestId("share-start").click();
  await expect(member.getByTestId("share-stop")).toBeVisible();
  await expect(owner.getByTestId("stat-riders")).toContainText("1 on board");
  await expect(owner.getByTestId("stat-vehicles")).toContainText("1 vehicle");
  await expect(owner.getByTestId("vehicle-row")).toHaveCount(1);
  await expect(owner.getByTestId("vehicle-row").first()).toContainText("36B");
  await member.getByTestId("share-stop").click();
  await expect(owner.getByTestId("stat-riders")).toContainText("0 on board");
  await expect(owner.getByTestId("vehicle-row")).toHaveCount(0);

  // Phone-sized smoke.
  const phone = await (
    await runtime.context("member", {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
  ).newPage();
  await phone.goto("/lines");
  await expect(phone.getByTestId("line-row").first()).toBeVisible();
  await phone.goto("/");
  await expect(phone.getByTestId("live-map")).toBeVisible();
  await expect(phone.getByTestId("stat-riders")).toBeVisible();
  await phone.close();

  // The journey's picture: a member riding 36B, seen on the live map.
  await pick(member, "share-line", /^36B/);
  await member.getByTestId("share-start").click();
  await expect(owner.getByTestId("vehicle-row")).toHaveCount(1);
  await runtime.assertBackLink(owner);
  await owner.getByTestId("live-map").scrollIntoViewIfNeeded();
  await runtime.screenshot(owner);
} finally {
  await runtime.close();
}
