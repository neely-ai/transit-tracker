import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, MapPin, Navigation, Square } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { LineBadge } from "@/client/components/LineBadge";
import { NetworkMap } from "@/client/components/NetworkMap";
import { PageHeader } from "@/client/components/PageHeader";
import { Picker } from "@/client/components/Picker";
import { errorMessage } from "@/client/components/Reports";
import { ScopeToggle, type Scope } from "@/client/components/ScopeToggle";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { useLive } from "@/client/hooks/useLive";
import { useLocationAccess, useRide } from "@/client/hooks/useRide";
import { getLive, getReports } from "@/serverFunctions/member";
import { getNetwork } from "@/serverFunctions/network";
import {
  CATEGORY_LABELS,
  lineName,
  type ReportCategory,
} from "@/shared/network";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [network, live, { reports }] = await Promise.all([
      getNetwork(),
      getLive(),
      getReports({ data: { status: "open" } }),
    ]);
    return { ...network, live, reports };
  },
  head: () => ({ meta: [{ title: "Transit Tracker" }] }),
  component: LiveMap,
});

const EVERY_LINE = "every-line";

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function LiveMap() {
  const { lines, admin, live: initial, reports } = Route.useLoaderData();
  const live = useLive(initial);
  const [scope, setScope] = useState<Scope>("all");
  const [isolated, setIsolated] = useState(EVERY_LINE);

  const inScope = useMemo(
    () => lines.filter((line) => scope === "all" || line.favorite),
    [lines, scope],
  );
  const shown = useMemo(
    () =>
      isolated === EVERY_LINE
        ? inScope
        : inScope.filter((line) => line.id === isolated),
    [inScope, isolated],
  );
  const shownIds = new Set(shown.map((line) => line.id));
  const byId = new Map(lines.map((line) => [line.id, line]));
  const vehicles = live.vehicles.filter((vehicle) =>
    shownIds.has(vehicle.lineId),
  );
  const openReports = reports.filter((report) => shownIds.has(report.lineId));
  const reportPins = useMemo(
    () =>
      openReports.flatMap((report) =>
        report.lat !== null && report.lng !== null
          ? [{ key: report.id, lat: report.lat, lng: report.lng }]
          : [],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reports, shown],
  );
  const vehiclePins = useMemo(
    () => vehicles.map((vehicle) => ({ ...vehicle })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live.vehicles, shown],
  );

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader
        title="Live map"
        description={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <span data-testid="stat-vehicles">
              {count(live.vehicles.length, "vehicle", "vehicles")}
            </span>
            <span data-testid="stat-riders">{live.riders} on board</span>
            <span data-testid="stat-viewers">
              {live.viewers === null ? "–" : live.viewers} viewing
            </span>
          </span>
        }
      />

      {lines.length === 0 ? (
        <EmptyState
          title="No lines yet"
          description={
            admin
              ? "Add the network's lines to see them here."
              : "An admin adds the network's lines."
          }
          action={
            admin ? (
              <Button render={<Link to="/lines/new" />} nativeButton={false}>
                New line
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ScopeToggle
              value={scope}
              onChange={(value) => {
                setScope(value);
                setIsolated(EVERY_LINE);
              }}
            />
            <Picker
              testId="isolate-line"
              label="Line shown"
              className="w-60"
              value={isolated}
              onChange={setIsolated}
              items={[
                { value: EVERY_LINE, label: "Every line" },
                ...inScope.map((line) => ({
                  value: line.id,
                  label: `${line.code} ${lineName(line)}`,
                })),
              ]}
            />
          </div>
          <NetworkMap
            testId="live-map"
            lines={shown}
            vehicles={vehiclePins}
            reports={reportPins}
          />
          <ShareRide lines={lines} initial={initial.myRide} />
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">On the move</h2>
            {vehicles.length ? (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {vehicles.map((vehicle) => {
                  const line = byId.get(vehicle.lineId);
                  if (!line) return null;
                  return (
                    <li
                      key={vehicle.key}
                      data-testid="vehicle-row"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm"
                    >
                      <LineBadge line={line} />
                      <span className="min-w-0 flex-1 truncate">
                        {lineName(line)}
                      </span>
                      <span className="text-muted-foreground">
                        {count(vehicle.riders, "rider", "riders")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                size="sm"
                variant="plain"
                icon={Bus}
                title="No one is sharing a ride right now"
              />
            )}
          </section>
          {openReports.length ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Open reports</h2>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {openReports.map((report) => (
                  <li
                    key={report.id}
                    data-testid="map-report"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm"
                  >
                    <LineBadge
                      line={{
                        id: report.lineId,
                        code: report.lineCode,
                        color: report.lineColor,
                      }}
                    />
                    <span className="font-medium">
                      {CATEGORY_LABELS[report.category as ReportCategory] ??
                        report.category}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {report.stationName ? `${report.stationName} · ` : ""}
                      {report.note}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Lines</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {inScope.map((line) => (
                <li
                  key={line.id}
                  data-testid="map-line"
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <LineBadge line={line} />
                  <span className="min-w-0 truncate">{lineName(line)}</span>
                </li>
              ))}
            </ul>
            {scope === "mine" && inScope.length === 0 ? (
              <EmptyState
                size="sm"
                title="No starred lines"
                description="Star lines on the Lines page to see only those here."
              />
            ) : null}
          </section>
        </>
      )}
    </AppShell>
  );
}

function ShareRide({
  lines,
  initial,
}: {
  lines: { id: string; code: string; fromName: string; toName: string }[];
  initial: { rideId: string; lineId: string } | null;
}) {
  const { access, ask } = useLocationAccess();
  const { ride, start, stop } = useRide(initial);
  const [lineId, setLineId] = useState<string | null>(initial?.lineId ?? null);
  const [pending, setPending] = useState(false);
  const riding = ride ? lines.find((line) => line.id === ride.lineId) : null;

  async function run(work: () => Promise<void>) {
    setPending(true);
    try {
      await work();
    } catch (error) {
      toast.error(
        error instanceof GeolocationPositionError
          ? "Your location isn't available."
          : errorMessage(error),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Navigation className="size-4 text-primary" aria-hidden />
        <h2 className="font-semibold">Share your ride</h2>
      </div>
      {access !== "granted" && access !== "checking" && !ride ? (
        <Alert data-testid="location-prompt">
          <MapPin />
          <AlertTitle>
            {access === "unsupported"
              ? "This browser can't share its location"
              : "Location access is needed to share a ride"}
          </AlertTitle>
          {access === "prompt" ? (
            <AlertDescription>
              <Button size="sm" variant="outline" onClick={ask}>
                Allow location
              </Button>
            </AlertDescription>
          ) : access === "denied" ? (
            <AlertDescription>
              Turn location on for this site in your browser's settings.
            </AlertDescription>
          ) : null}
        </Alert>
      ) : null}
      {ride ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm">
            Sharing your position on{" "}
            <span className="font-medium">
              {riding ? `${riding.code} ${lineName(riding)}` : "this line"}
            </span>
          </p>
          <Button
            variant="destructive"
            data-testid="share-stop"
            pending={pending}
            onClick={() => run(stop)}
          >
            <Square data-icon="inline-start" />
            Stop sharing
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Picker
            testId="share-line"
            label="Line you're on"
            placeholder="Line you're on"
            className="w-64"
            value={lineId}
            onChange={setLineId}
            items={lines.map((line) => ({
              value: line.id,
              label: `${line.code} ${lineName(line)}`,
            }))}
          />
          <Button
            data-testid="share-start"
            pending={pending}
            disabled={access !== "granted" || !lineId}
            onClick={() => run(() => start(lineId!))}
          >
            Start sharing
          </Button>
        </div>
      )}
    </section>
  );
}
