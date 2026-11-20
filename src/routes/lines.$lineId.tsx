import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { LineBadge } from "@/client/components/LineBadge";
import { KindBadge, StarButton } from "@/client/components/LineBits";
import { LineForm, type LineValues } from "@/client/components/LineForm";
import { NetworkMap } from "@/client/components/NetworkMap";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import {
  errorMessage,
  ReportButton,
  ReportList,
} from "@/client/components/Reports";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import type { Station } from "@/server/network";
import { getReports } from "@/serverFunctions/member";
import {
  addStation,
  deleteLine,
  deleteStation,
  getLine,
  moveStation,
  updateLine,
  updateStation,
} from "@/serverFunctions/network";
import { lineName } from "@/shared/network";

export const Route = createFileRoute("/lines/$lineId")({
  loader: async ({ params }) => {
    const [{ line, admin }, { reports }] = await Promise.all([
      getLine({ data: params.lineId }),
      getReports({ data: { lineId: params.lineId, status: "open" } }),
    ]);
    return { line, admin, reports };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.line
          ? `${loaderData.line.code} · Transit Tracker`
          : "Transit Tracker",
      },
    ],
  }),
  component: LinePage,
});

function LinePage() {
  const { line, admin, reports } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);

  if (!line) {
    return (
      <AppShell nav={<AppNav />}>
        <PageHeader
          title="Line not found"
          backLink={<BackLink to="/lines">Lines</BackLink>}
        />
        <EmptyState
          kind="filtered"
          title="This line was deleted or never existed"
        />
      </AppShell>
    );
  }

  async function saveLine(values: LineValues) {
    try {
      await updateLine({ data: { id: line!.id, ...values } });
      setEditing(false);
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader
        backLink={<BackLink to="/lines">Lines</BackLink>}
        title={
          <span className="flex items-center gap-3">
            <LineBadge line={line} link={false} />
            <span className="min-w-0">{lineName(line)}</span>
          </span>
        }
        description={
          <span className="flex items-center gap-2">
            <KindBadge kind={line.kind} />
            {line.stationCount}{" "}
            {line.stationCount === 1 ? "station" : "stations"}
          </span>
        }
        actions={
          <>
            <StarButton line={line} />
            <ReportButton line={line} />
            {admin ? (
              <>
                <Button
                  variant="outline"
                  data-testid="line-edit"
                  onClick={() => setEditing(true)}
                >
                  <Pencil data-icon="inline-start" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  data-testid="line-delete"
                  aria-label="Delete line"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 />
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <NetworkMap
        testId="line-map"
        lines={[line]}
        showStations
        reports={reports.flatMap((report) =>
          report.lat !== null && report.lng !== null
            ? [{ key: report.id, lat: report.lat, lng: report.lng }]
            : [],
        )}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Stations</h2>
        {line.stations.length ? (
          <ol className="divide-y divide-border rounded-xl border border-border bg-card">
            {line.stations.map((station, index) => (
              <StationRow
                key={station.id}
                station={station}
                index={index}
                last={index === line.stations.length - 1}
                admin={admin}
              />
            ))}
          </ol>
        ) : (
          <EmptyState size="sm" title="No stations yet" />
        )}
        {admin ? <AddStation lineId={line.id} /> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Open reports</h2>
        {reports.length ? (
          <ReportList reports={reports} admin={admin} showLine={false} />
        ) : (
          <EmptyState size="sm" variant="plain" title="No open reports" />
        )}
      </section>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {line.code}</DialogTitle>
          </DialogHeader>
          <LineForm
            initial={{
              code: line.code,
              kind: line.kind as LineValues["kind"],
              fromName: line.fromName,
              toName: line.toName,
              color: line.color as LineValues["color"],
            }}
            submitLabel="Save"
            onSubmit={saveLine}
          />
        </DialogContent>
      </Dialog>
      {deleting ? (
        <ConfirmDialog
          title={`Delete line ${line.code}?`}
          confirmLabel="Delete line"
          destructive
          pending={pending}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            setPending(true);
            try {
              await deleteLine({ data: { id: line.id } });
              await navigate({ to: "/lines" });
            } catch (error) {
              toast.error(errorMessage(error));
              setPending(false);
            }
          }}
        >
          Its stations, reports and live rides are deleted too.
        </ConfirmDialog>
      ) : null}
    </AppShell>
  );
}

function StationRow({
  station,
  index,
  last,
  admin,
}: {
  station: Station;
  index: number;
  last: boolean;
  admin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);

  async function run(work: () => Promise<unknown>) {
    setPending(true);
    try {
      await work();
      await router.invalidate();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setPending(false);
    }
  }

  return (
    <li
      data-testid="station-row"
      className="flex items-center gap-3 px-4 py-2.5"
    >
      <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{station.name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {station.lat.toFixed(5)}, {station.lng.toFixed(5)}
        </p>
      </div>
      {admin ? (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Move ${station.name} up`}
            disabled={index === 0 || pending}
            onClick={() =>
              run(() =>
                moveStation({ data: { id: station.id, direction: "up" } }),
              )
            }
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Move ${station.name} down`}
            disabled={last || pending}
            onClick={() =>
              run(() =>
                moveStation({ data: { id: station.id, direction: "down" } }),
              )
            }
          >
            <ArrowDown />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${station.name}`}
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${station.name}`}
            onClick={() => setDeleting(true)}
          >
            <Trash2 />
          </Button>
        </div>
      ) : null}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit station</DialogTitle>
          </DialogHeader>
          <StationFields
            prefix="edit-station"
            initial={station}
            submitLabel="Save"
            submitTestId="station-save"
            onSubmit={async (values) => {
              if (
                await run(() =>
                  updateStation({ data: { id: station.id, ...values } }),
                )
              )
                setEditing(false);
            }}
          />
        </DialogContent>
      </Dialog>
      {deleting ? (
        <ConfirmDialog
          title={`Delete ${station.name}?`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onClose={() => setDeleting(false)}
          onConfirm={() =>
            run(async () => {
              await deleteStation({ data: { id: station.id } });
              setDeleting(false);
            })
          }
        />
      ) : null}
    </li>
  );
}

function AddStation({ lineId }: { lineId: string }) {
  const router = useRouter();
  const [key, setKey] = useState(0);
  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <StationFields
        key={key}
        prefix="station"
        submitLabel="Add station"
        submitTestId="station-add"
        inline
        onSubmit={async (values) => {
          try {
            await addStation({ data: { lineId, ...values } });
            setKey((value) => value + 1);
            await router.invalidate();
          } catch (error) {
            toast.error(errorMessage(error));
          }
        }}
      />
    </div>
  );
}

function StationFields({
  prefix,
  initial,
  submitLabel,
  submitTestId,
  inline = false,
  onSubmit,
}: {
  prefix: string;
  initial?: { name: string; lat: number; lng: number };
  submitLabel: string;
  submitTestId: string;
  inline?: boolean;
  onSubmit: (values: {
    name: string;
    lat: number;
    lng: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [lat, setLat] = useState(initial ? String(initial.lat) : "");
  const [lng, setLng] = useState(initial ? String(initial.lng) : "");
  const [pending, setPending] = useState(false);
  const latitude = Number(lat);
  const longitude = Number(lng);
  const valid =
    name.trim() !== "" &&
    lat.trim() !== "" &&
    lng.trim() !== "" &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const submit = (
    <Button
      type="submit"
      data-testid={submitTestId}
      pending={pending}
      disabled={!valid}
      variant={inline ? "secondary" : "default"}
    >
      {inline ? <Plus data-icon="inline-start" /> : null}
      {submitLabel}
    </Button>
  );

  return (
    <form
      className={inline ? "flex flex-wrap items-end gap-3" : "space-y-4"}
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        try {
          await onSubmit({ name: name.trim(), lat: latitude, lng: longitude });
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="min-w-40 flex-1 space-y-2">
        <Label htmlFor={`${prefix}-name`}>Station</Label>
        <Input
          id={`${prefix}-name`}
          data-testid={`${prefix}-name`}
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className={inline ? "w-28 space-y-2" : "space-y-2"}>
        <Label htmlFor={`${prefix}-lat`}>Latitude</Label>
        <Input
          id={`${prefix}-lat`}
          data-testid={`${prefix}-lat`}
          inputMode="decimal"
          value={lat}
          onChange={(event) => setLat(event.target.value)}
        />
      </div>
      <div className={inline ? "w-28 space-y-2" : "space-y-2"}>
        <Label htmlFor={`${prefix}-lng`}>Longitude</Label>
        <Input
          id={`${prefix}-lng`}
          data-testid={`${prefix}-lng`}
          inputMode="decimal"
          value={lng}
          onChange={(event) => setLng(event.target.value)}
        />
      </div>
      {inline ? submit : <DialogFooter>{submit}</DialogFooter>}
    </form>
  );
}
