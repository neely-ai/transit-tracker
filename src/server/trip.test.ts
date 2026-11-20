import { describe, expect, it } from "vitest";
import { planTrip } from "./trip";

const line = (id: string, ...names: string[]) => ({
  id,
  code: id.toUpperCase(),
  stations: names.map((name) => ({ name })),
});

const network = [
  line("a", "North", "Market", "Centre", "South"),
  line("b", "Centre", "River", "Airport"),
  line("c", "Lake", "Market"),
  line("d", "Hill", "Coast"),
];

describe("planTrip", () => {
  it("finds direct lines that reach the departure first", () => {
    expect(planTrip(network, "North", "Centre")).toEqual([
      {
        legs: [
          { lineId: "a", code: "A", from: "North", to: "Centre", stops: 2 },
        ],
        stops: 2,
        change: null,
      },
    ]);
    expect(planTrip(network, "Centre", "North")).toEqual([]);
  });

  it("falls back to one change at a shared station", () => {
    const [route] = planTrip(network, "North", "Airport");
    expect(route?.change).toBe("Centre");
    expect(route?.stops).toBe(4);
    expect(route?.legs.map((leg) => leg.code)).toEqual(["A", "B"]);
  });

  it("returns nothing when no route exists", () => {
    expect(planTrip(network, "North", "Coast")).toEqual([]);
  });
});
