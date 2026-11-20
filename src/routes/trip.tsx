import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Route as RouteIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { LineBadge } from "@/client/components/LineBadge";
import { PageHeader } from "@/client/components/PageHeader";
import { Picker } from "@/client/components/Picker";
import { errorMessage } from "@/client/components/Reports";
import { Button } from "@/client/components/ui/button";
import { Label } from "@/client/components/ui/label";
import type { TripRoute } from "@/server/trip";
import { findTrip } from "@/serverFunctions/member";
import { getNetwork } from "@/serverFunctions/network";

export const Route = createFileRoute("/trip")({
  loader: () => getNetwork(),
  head: () => ({ meta: [{ title: "Trip · Transit Tracker" }] }),
  component: Trip,
});

function stopsLabel(stops: number) {
  return `${stops} ${stops === 1 ? "stop" : "stops"}`;
}

function Trip() {
  const { lines } = Route.useLoaderData();
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [routes, setRoutes] = useState<TripRoute[] | null>(null);
  const [pending, setPending] = useState(false);

  const stations = useMemo(
    () =>
      [...new Set(lines.flatMap((line) => line.stations.map((s) => s.name)))]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    [lines],
  );
  const colors = new Map(lines.map((line) => [line.id, line.color]));

  async function search() {
    if (!from || !to) return;
    setPending(true);
    try {
      setRoutes(await findTrip({ data: { from, to } }));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader title="Trip" />
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <div className="min-w-44 flex-1 space-y-2">
          <Label>From</Label>
          <Picker
            testId="trip-from"
            label="From"
            placeholder="Departure station"
            items={stations}
            value={from}
            onChange={(value) => {
              setFrom(value);
              setRoutes(null);
            }}
          />
        </div>
        <div className="min-w-44 flex-1 space-y-2">
          <Label>To</Label>
          <Picker
            testId="trip-to"
            label="To"
            placeholder="Destination station"
            items={stations}
            value={to}
            onChange={(value) => {
              setTo(value);
              setRoutes(null);
            }}
          />
        </div>
        <Button
          type="submit"
          data-testid="trip-search"
          pending={pending}
          disabled={!from || !to || from === to}
        >
          Find routes
        </Button>
      </form>

      {routes === null ? null : routes.length ? (
        <ul className="space-y-3">
          {routes.map((route) => (
            <li
              key={route.legs
                .map((leg) => `${leg.lineId}:${leg.from}`)
                .join("|")}
              data-testid="trip-result"
              className="space-y-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">
                  {route.change ? `Change at ${route.change}` : "Direct"}
                </span>
                <span className="text-muted-foreground">
                  {stopsLabel(route.stops)}
                </span>
              </div>
              <ol className="space-y-2">
                {route.legs.map((leg) => (
                  <li
                    key={`${leg.lineId}-${leg.from}`}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <LineBadge
                      line={{
                        id: leg.lineId,
                        code: leg.code,
                        color: colors.get(leg.lineId) ?? "",
                      }}
                    />
                    <span>{leg.from}</span>
                    <ArrowRight
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    <span>{leg.to}</span>
                    <span className="text-muted-foreground">
                      · {stopsLabel(leg.stops)}
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      ) : (
        <div data-testid="trip-empty">
          <EmptyState
            kind="filtered"
            icon={RouteIcon}
            title="No route found"
            description="No line connects them directly or with one change."
          />
        </div>
      )}
    </AppShell>
  );
}
