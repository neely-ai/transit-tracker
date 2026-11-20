import {
  startRuntime,
  expect,
} from "/home/user/oss-new/control/runtime/index.mjs";
import { seedNetwork, pick } from "./lib.mjs";

const runtime = await startRuntime();
try {
  await seedNetwork(runtime);
  let member = await (await runtime.context("member")).newPage();
  let owner = await (await runtime.context("owner")).newPage();
  await owner.goto("/lines/line-l4");
  await owner.getByTestId("station-name").fill("Botanic Garden");
  await owner.getByTestId("station-lat").fill("36.835");
  await owner.getByTestId("station-lng").fill("10.21");
  await owner.getByTestId("station-add").click();
  await expect(owner.getByTestId("station-row")).toHaveCount(4);
  await member.goto("/lines");
  await member.getByTestId("star-L4").click();
  await expect(member.getByTestId("star-L4")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await member.goto("/lines/line-l4");
  await member.getByTestId("report-open").click();
  await pick(member, "report-category", "Safety");
  await member
    .getByTestId("report-note")
    .fill("Broken lighting on the platform");
  await member.getByTestId("report-submit").click();
  await expect(member.getByTestId("report-row")).toHaveCount(1);

  await runtime.restart();

  member = await (await runtime.context("member")).newPage();
  owner = await (await runtime.context("owner")).newPage();
  await member.goto("/lines");
  await member.getByTestId("scope-mine").click();
  await expect(member.getByTestId("line-row")).toHaveCount(1);
  await expect(member.getByTestId("line-row").first()).toContainText("L4");
  await owner.goto("/lines/line-l4");
  await expect(owner.getByTestId("station-row").last()).toContainText(
    "Botanic Garden",
  );
  await owner.goto("/reports");
  await expect(owner.getByTestId("report-row").first()).toContainText(
    "Broken lighting on the platform",
  );
} finally {
  await runtime.close();
}
