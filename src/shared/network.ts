// Values shared by the pages and the server.

export const LINE_KINDS = ["bus", "metro", "light_rail", "train"] as const;
export type LineKind = (typeof LINE_KINDS)[number];
export const KIND_LABELS: Record<LineKind, string> = {
  bus: "Bus",
  metro: "Metro",
  light_rail: "Light rail",
  train: "Train",
};

/** The fixed palette a line's colour comes from, each a theme token. */
export const LINE_COLORS = [
  "blue",
  "orange",
  "green",
  "amber",
  "pink",
  "red",
  "sky",
] as const;
export type LineColor = (typeof LINE_COLORS)[number];
export const COLOR_TOKENS: Record<LineColor, string> = {
  blue: "--chart-1",
  orange: "--chart-2",
  green: "--chart-3",
  amber: "--chart-4",
  pink: "--chart-5",
  red: "--destructive",
  sky: "--info",
};
export const COLOR_LABELS: Record<LineColor, string> = {
  blue: "Blue",
  orange: "Orange",
  green: "Green",
  amber: "Amber",
  pink: "Pink",
  red: "Red",
  sky: "Sky",
};

export const REPORT_CATEGORIES = [
  "delay",
  "crowded",
  "breakdown",
  "safety",
  "other",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  delay: "Delay",
  crowded: "Crowded",
  breakdown: "Breakdown",
  safety: "Safety",
  other: "Other",
};

export const MAX_FAVORITES = 5;
/** A ride with no position for this long stops showing. */
export const RIDE_TIMEOUT_MS = 2 * 60 * 1000;
/** How often a rider's browser sends its position. */
export const POSITION_INTERVAL_MS = 10 * 1000;

export function lineName(line: { fromName: string; toName: string }) {
  return `${line.fromName} – ${line.toName}`;
}
