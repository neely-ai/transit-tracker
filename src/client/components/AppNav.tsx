import { Link } from "@tanstack/react-router";

const LINKS = [
  { to: "/", label: "Map" },
  { to: "/lines", label: "Lines" },
  { to: "/trip", label: "Trip" },
  { to: "/reports", label: "Reports" },
] as const;

export function AppNav() {
  return (
    <nav className="flex min-w-0 items-center gap-3 overflow-x-auto text-sm">
      {LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          activeOptions={{ exact: link.to === "/" }}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground data-[status=active]:font-medium data-[status=active]:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
