import { useRouter } from "@tanstack/react-router";
import { Check, Flag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { LineBadge } from "@/client/components/LineBadge";
import { Picker } from "@/client/components/Picker";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Label } from "@/client/components/ui/label";
import { Textarea } from "@/client/components/ui/textarea";
import type { Report } from "@/server/reports";
import {
  createReport,
  deleteReport,
  resolveReport,
} from "@/serverFunctions/member";
import {
  CATEGORY_LABELS,
  REPORT_CATEGORIES,
  type ReportCategory,
} from "@/shared/network";

const WHOLE_LINE = "whole-line";

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** "Report a problem" on a line, optionally at one of its stations. */
export function ReportButton({
  line,
}: {
  line: { id: string; code: string; stations: { id: string; name: string }[] };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [stationId, setStationId] = useState(WHOLE_LINE);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!category) return;
    setPending(true);
    try {
      await createReport({
        data: {
          lineId: line.id,
          stationId: stationId === WHOLE_LINE ? null : stationId,
          category,
          note,
        },
      });
      setOpen(false);
      setCategory(null);
      setStationId(WHOLE_LINE);
      setNote("");
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        data-testid="report-open"
        onClick={() => setOpen(true)}
      >
        <Flag data-icon="inline-start" />
        Report a problem
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Report a problem on {line.code}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Problem</Label>
              <Picker
                testId="report-category"
                label="Problem"
                placeholder="Choose one"
                value={category}
                onChange={(value) => setCategory(value as ReportCategory)}
                items={REPORT_CATEGORIES.map((value) => ({
                  value,
                  label: CATEGORY_LABELS[value],
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Where</Label>
              <Picker
                testId="report-station"
                label="Where"
                value={stationId}
                onChange={setStationId}
                items={[
                  { value: WHOLE_LINE, label: "Whole line" },
                  ...line.stations.map((station) => ({
                    value: station.id,
                    label: station.name,
                  })),
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-note">Note</Label>
              <Textarea
                id="report-note"
                data-testid="report-note"
                value={note}
                maxLength={280}
                required
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                data-testid="report-submit"
                pending={pending}
                disabled={!category || !note.trim()}
              >
                Send report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

const TIME = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Reports with resolve (admins) and delete (author or admin). */
export function ReportList({
  reports,
  admin,
  showLine = true,
}: {
  reports: Report[];
  admin: boolean;
  showLine?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<Report | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function run(id: string, work: () => Promise<unknown>) {
    setPending(id);
    try {
      await work();
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {reports.map((report) => (
        <li
          key={report.id}
          data-testid="report-row"
          className="flex flex-wrap items-start gap-3 p-4"
        >
          {showLine ? (
            <LineBadge
              line={{
                id: report.lineId,
                code: report.lineCode,
                color: report.lineColor,
              }}
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">
                {CATEGORY_LABELS[report.category as ReportCategory] ??
                  report.category}
              </span>
              {report.stationName ? (
                <span className="text-muted-foreground">
                  at {report.stationName}
                </span>
              ) : null}
              <Badge variant={report.status === "open" ? "warning" : "success"}>
                {report.status === "open" ? "Open" : "Resolved"}
              </Badge>
            </div>
            <p className="text-sm break-words">{report.note}</p>
            <p className="text-xs text-muted-foreground">
              {TIME.format(report.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {admin && report.status === "open" ? (
              <Button
                size="sm"
                variant="outline"
                data-testid="report-resolve"
                pending={pending === report.id}
                onClick={() =>
                  run(report.id, () =>
                    resolveReport({ data: { id: report.id } }),
                  )
                }
              >
                <Check data-icon="inline-start" />
                Resolve
              </Button>
            ) : null}
            {admin || report.mine ? (
              <Button
                size="icon-sm"
                variant="ghost"
                data-testid="report-delete"
                aria-label="Delete report"
                onClick={() => setDeleting(report)}
              >
                <Trash2 />
              </Button>
            ) : null}
          </div>
        </li>
      ))}
      {deleting ? (
        <ConfirmDialog
          title="Delete this report?"
          confirmLabel="Delete"
          destructive
          pending={pending === deleting.id}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(deleting.id, async () => {
              await deleteReport({ data: { id: deleting.id } });
              setDeleting(null);
            })
          }
        />
      ) : null}
    </ul>
  );
}
