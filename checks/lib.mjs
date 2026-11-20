import { expect } from "/home/user/oss-new/control/runtime/index.mjs";

// Moves the sample network's made-up coordinates onto one invented city area.
const LAT_SHIFT = 1.93;
const LNG_SHIFT = -19.33;

// A small sample network, written straight into D1 so suites start from real data.
export const NETWORK = [
  {
    id: "line-36b",
    code: "36B",
    kind: "bus",
    from: "Harbour Gate",
    to: "Northfield",
    color: "blue",
    stations: [
      ["Harbour Gate", 36.8, 10.18],
      ["Market Square", 36.805, 10.175],
      ["Central Station", 36.81, 10.17],
      ["University", 36.82, 10.16],
      ["Northfield", 36.83, 10.15],
    ],
  },
  {
    id: "line-m1",
    code: "M1",
    kind: "metro",
    from: "Central Station",
    to: "Airport",
    color: "orange",
    stations: [
      ["Central Station", 36.81, 10.17],
      ["Riverside", 36.815, 10.19],
      ["Old Town", 36.82, 10.21],
      ["Airport", 36.85, 10.23],
    ],
  },
  {
    id: "line-l4",
    code: "L4",
    kind: "light_rail",
    from: "Lakeside",
    to: "Old Town",
    color: "green",
    stations: [
      ["Lakeside", 36.84, 10.2],
      ["Garden Park", 36.83, 10.205],
      ["Old Town", 36.82, 10.21],
    ],
  },
  {
    id: "line-r2",
    code: "R2",
    kind: "train",
    from: "Coast Road",
    to: "Hill Village",
    color: "pink",
    stations: [
      ["Coast Road", 36.78, 10.25],
      ["Hill Village", 36.76, 10.28],
    ],
  },
  {
    id: "line-20",
    code: "20",
    kind: "bus",
    from: "Stadium",
    to: "Market Square",
    color: "amber",
    stations: [
      ["Stadium", 36.795, 10.165],
      ["Market Square", 36.805, 10.175],
    ],
  },
  {
    id: "line-71",
    code: "71",
    kind: "bus",
    from: "Old Town",
    to: "Beach Front",
    color: "sky",
    stations: [
      ["Old Town", 36.82, 10.21],
      ["Beach Front", 36.8, 10.24],
    ],
  },
];

export async function seedNetwork(runtime) {
  const db = await runtime.database();
  const now = Date.now();
  const statements = [];
  for (const line of NETWORK) {
    statements.push(
      db
        .prepare(
          "INSERT INTO lines (id, code, kind, from_name, to_name, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          line.id,
          line.code,
          line.kind,
          line.from,
          line.to,
          line.color,
          now,
        ),
    );
    line.stations.forEach(([name, rawLat, rawLng], position) => {
      const [lat, lng] = [rawLat + LAT_SHIFT, rawLng + LNG_SHIFT];
      statements.push(
        db
          .prepare(
            "INSERT INTO stations (id, line_id, position, name, lat, lng) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(`${line.id}-s${position}`, line.id, position, name, lat, lng),
      );
    });
  }
  await db.batch(statements);
}

export async function rows(runtime, sql, ...params) {
  const result = await (
    await runtime.database()
  )
    .prepare(sql)
    .bind(...params)
    .all();
  return result.results;
}

/** Opens a Select by its test id and picks the option. */
export async function pick(page, testId, option) {
  await page.getByTestId(testId).click();
  await page
    .getByRole("option", { name: option, exact: typeof option === "string" })
    .click();
}

/** Runs `trigger` and returns the first POST it sends to a server function. */
export async function captureServerFn(page, trigger) {
  let captured = null;
  const handler = async (route) => {
    const request = route.request();
    if (!captured && request.method() === "POST") {
      captured = {
        url: request.url(),
        headers: request.headers(),
        body: request.postData() ?? "",
      };
    }
    await route.continue();
  };
  await page.route("**/_serverFn/**", handler);
  await trigger();
  await expect.poll(() => captured !== null, { timeout: 20000 }).toBe(true);
  await page.unroute("**/_serverFn/**", handler);
  return captured;
}

/** Sends a captured server function call again from `page`, with ids swapped. */
export async function replay(page, captured, swaps = []) {
  let body = captured.body;
  for (const [from, to] of swaps) {
    expect(body).toContain(from);
    body = body.split(from).join(to);
  }
  const headers = Object.fromEntries(
    Object.entries(captured.headers).filter(
      ([name]) =>
        !["cookie", "content-length", "host"].includes(name.toLowerCase()),
    ),
  );
  return page.evaluate(
    async ({ url, headers, body }) => {
      const response = await fetch(url, { method: "POST", headers, body });
      return { status: response.status, text: await response.text() };
    },
    { url: captured.url, headers, body },
  );
}

export const LOCATION = { latitude: 36.805, longitude: 10.175 };
