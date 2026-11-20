import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { COLOR_TOKENS, type LineColor } from "@/shared/network";

/** Tailwind classes for each palette colour, written out so Tailwind sees them. */
const SWATCH: Record<LineColor, string> = {
  blue: "bg-chart-1",
  orange: "bg-chart-2",
  green: "bg-chart-3",
  amber: "bg-chart-4",
  pink: "bg-chart-5",
  red: "bg-destructive",
  sky: "bg-info",
};

export function swatchClass(color: string) {
  return SWATCH[color as LineColor] ?? "bg-muted-foreground";
}

/** The resolved colour of a palette entry, for drawing on the map. */
export function resolveColor(color: string) {
  return resolveToken(COLOR_TOKENS[color as LineColor] ?? "--muted-foreground");
}

export function resolveToken(token: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
}

/** A line's code on its colour, linking to the line. */
export function LineBadge({
  line,
  link = true,
}: {
  line: { id: string; code: string; color: string };
  link?: boolean;
}) {
  const className = cn(
    "inline-flex h-6 min-w-9 items-center justify-center rounded-md px-1.5 text-xs font-semibold text-primary-foreground",
    swatchClass(line.color),
  );
  if (!link) return <span className={className}>{line.code}</span>;
  return (
    <Link
      to="/lines/$lineId"
      params={{ lineId: line.id }}
      className={className}
    >
      {line.code}
    </Link>
  );
}
