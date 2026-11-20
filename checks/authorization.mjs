import {
  startRuntime,
  expect,
} from "/home/user/oss-new/control/runtime/index.mjs";
import {
  seedNetwork,
  rows,
  pick,
  captureServerFn,
  replay,
  LOCATION,
} from "./lib.mjs";

const runtime = await startRuntime();
try {
  await seedNetwork(runtime);
  await runtime.assertPrivateAccess([
    "/",
    "/lines",
    "/lines/line-36b",
    "/trip",
    "/reports",
    "/health",
  ]);

  // No public routes: anonymous and outsiders get nothing, including the live channel.
  for (const path of ["/", "/lines", "/reports", "/api/live"]) {
    for (const role of [undefined, "outsider"]) {
      const response = await runtime.fetch(path, { role });
      expect([401, 403, 404]).toContain(response.status);
    }
  }
  // The live channel opens for a member's browser, never for anyone else's.
  async function socketOpens(role) {
    const page = await (await runtime.context(role)).newPage();
    await page.goto("/");
    const opened = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const socket = new WebSocket(`ws://${location.host}/api/live`);
          socket.onopen = () => {
            socket.close();
            resolve(true);
          };
          socket.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 5000);
        }),
    );
    await page.close();
    return opened;
  }
  expect(await socketOpens(null)).toBe(false);
  expect(await socketOpens("outsider")).toBe(false);
  expect(await socketOpens("member")).toBe(true);
  // No sign-in page of its own.
  for (const path of ["/login", "/signin", "/sign-in", "/signup", "/logout"]) {
    const response = await runtime.fetch(path, { role: "member" });
    expect(response.status).toBe(404);
    expect((await response.text()).toLowerCase()).not.toContain("password");
  }

  const geo = { geolocation: LOCATION, permissions: ["geolocation"] };
  const owner = await (await runtime.context("owner", geo)).newPage();
  const member = await (await runtime.context("member", geo)).newPage();

  // Admin-only: members see no line or station controls and the server refuses them.
  await owner.goto("/lines/line-r2");
  await owner.getByTestId("station-name").fill("Quarry");
  await owner.getByTestId("station-lat").fill("36.75");
  await owner.getByTestId("station-lng").fill("10.30");
  const addStation = await captureServerFn(owner, () =>
    owner.getByTestId("station-add").click(),
  );
  await expect(owner.getByTestId("station-row")).toHaveCount(3);
  await owner.getByRole("button", { name: "Move Quarry up" }).click();
  await expect(owner.getByTestId("station-row")).toHaveText([
    /Coast Road/,
    /Quarry/,
    /Hill Village/,
  ]);
  const quarry = (
    await rows(runtime, "SELECT id FROM stations WHERE name = 'Quarry'")
  )[0].id;
  await owner.getByRole("button", { name: "Delete Quarry" }).click();
  const deleteStation = await captureServerFn(owner, () =>
    owner
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click(),
  );
  await expect(owner.getByTestId("station-row")).toHaveCount(2);
  await owner.goto("/lines/line-71");
  await owner.getByTestId("line-delete").click();
  const deleteLine = await captureServerFn(owner, () =>
    owner
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete line" })
      .click(),
  );
  await expect(owner).toHaveURL(/\/lines$/);

  await member.goto("/lines/line-36b");
  await expect(member.getByTestId("line-delete")).toHaveCount(0);
  await expect(member.getByTestId("station-add")).toHaveCount(0);
  await expect(member.getByRole("button", { name: /^Delete / })).toHaveCount(0);
  expect(
    (await replay(member, addStation, [["line-r2", "line-36b"]])).text,
  ).toContain("Only admins can change the network.");
  expect(
    (await replay(member, deleteStation, [[quarry, "line-36b-s1"]])).text,
  ).toContain("Only admins can change the network.");
  expect(
    (await replay(member, deleteLine, [["line-71", "line-36b"]])).text,
  ).toContain("Only admins can change the network.");
  expect(
    await rows(runtime, "SELECT id FROM lines WHERE id = 'line-36b'"),
  ).toHaveLength(1);
  expect(
    await rows(runtime, "SELECT id FROM stations WHERE line_id = 'line-36b'"),
  ).toHaveLength(5);
  await member.goto("/lines");
  await expect(member.getByTestId("new-line")).toHaveCount(0);
  await member.goto("/lines/new");
  await expect(member.getByTestId("line-save")).toHaveCount(0);

  // Reports: only the author or an admin deletes; only an admin resolves.
  await owner.goto("/lines/line-36b");
  await owner.getByTestId("report-open").click();
  await pick(owner, "report-category", "Breakdown");
  await owner.getByTestId("report-note").fill("Doors stuck on the rear car");
  await owner.getByTestId("report-submit").click();
  await expect(owner.getByTestId("report-row")).toHaveCount(1);
  const ownersReport = (
    await rows(runtime, "SELECT id FROM reports WHERE note LIKE 'Doors stuck%'")
  )[0].id;

  await member.goto("/lines/line-36b");
  await member.getByTestId("report-open").click();
  await pick(member, "report-category", "Other");
  await member.getByTestId("report-note").fill("Ticket machine out of order");
  await member.getByTestId("report-submit").click();
  await member.goto("/reports");
  await expect(member.getByTestId("report-row")).toHaveCount(2);
  await expect(
    member
      .getByTestId("report-row")
      .filter({ hasText: "Doors stuck" })
      .getByTestId("report-delete"),
  ).toHaveCount(0);
  await expect(member.getByTestId("report-resolve")).toHaveCount(0);
  const membersReport = (
    await rows(
      runtime,
      "SELECT id FROM reports WHERE note LIKE 'Ticket machine%'",
    )
  )[0].id;
  await member
    .getByTestId("report-row")
    .filter({ hasText: "Ticket machine" })
    .getByTestId("report-delete")
    .click();
  const deleteReport = await captureServerFn(member, () =>
    member
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click(),
  );
  await expect(member.getByTestId("report-row")).toHaveCount(1);
  expect(
    (await replay(member, deleteReport, [[membersReport, ownersReport]])).text,
  ).toContain("You can delete only your own reports.");
  expect(
    await rows(runtime, "SELECT id FROM reports WHERE id = ?", ownersReport),
  ).toHaveLength(1);

  await owner.goto("/reports");
  const resolve = await captureServerFn(owner, () =>
    owner
      .getByTestId("report-row")
      .first()
      .getByTestId("report-resolve")
      .click(),
  );
  await expect(owner.getByTestId("report-row").first()).toContainText(
    "Resolved",
  );
  await (await runtime.database())
    .prepare(
      "UPDATE reports SET status = 'open', resolved_at = NULL WHERE id = ?",
    )
    .bind(ownersReport)
    .run();
  await member.goto("/reports");
  expect((await replay(member, resolve)).text).toContain(
    "Only admins can resolve reports.",
  );
  expect(
    (
      await rows(
        runtime,
        "SELECT status FROM reports WHERE id = ?",
        ownersReport,
      )
    )[0].status,
  ).toBe("open");
  // An admin deletes anyone's report.
  await owner.goto("/reports");
  await owner
    .getByTestId("report-row")
    .first()
    .getByTestId("report-delete")
    .click();
  await owner
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(owner.getByTestId("report-row")).toHaveCount(0);

  // Favourites are private.
  await owner.goto("/lines");
  await owner.getByTestId("star-M1").click();
  await expect(owner.getByTestId("star-M1")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await member.goto("/lines");
  await expect(member.getByTestId("star-M1")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await member.getByTestId("scope-mine").click();
  await expect(member.getByTestId("line-row")).toHaveCount(0);

  // Rides: only the rider moves or stops their own ride, and riders stay anonymous.
  await owner.goto("/");
  await pick(owner, "share-line", /^M1/);
  await owner.getByTestId("share-start").click();
  await expect(owner.getByTestId("share-stop")).toBeVisible();
  const ownersRide = (
    await rows(runtime, "SELECT id, lat, lng FROM rides WHERE ended_at IS NULL")
  )[0];
  await member.goto("/");
  await expect(member.getByTestId("vehicle-row")).toHaveCount(1);
  expect(await member.content()).not.toContain("owner@");
  await pick(member, "share-line", /^36B/);
  await member.getByTestId("share-start").click();
  await expect(member.getByTestId("share-stop")).toBeVisible();
  const membersRide = (
    await rows(
      runtime,
      "SELECT id FROM rides WHERE ended_at IS NULL AND id != ?",
      ownersRide.id,
    )
  )[0].id;
  const stopRide = await captureServerFn(member, () =>
    member.getByTestId("share-stop").click(),
  );
  await replay(member, stopRide, [[membersRide, ownersRide.id]]);
  const after = (
    await rows(
      runtime,
      "SELECT ended_at FROM rides WHERE id = ?",
      ownersRide.id,
    )
  )[0];
  expect(after.ended_at).toBeNull();
  await expect(member.getByTestId("vehicle-row")).toHaveCount(1);
} finally {
  await runtime.close();
}
