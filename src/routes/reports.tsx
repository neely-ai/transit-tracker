import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Picker } from "@/client/components/Picker";
import { ReportList } from "@/client/components/Reports";
import { getReports } from "@/serverFunctions/member";
import { getNetwork } from "@/serverFunctions/network";

const search = z.object({
  line: z.string().optional().catch(undefined),
  status: z.enum(["open", "resolved", "all"]).optional().catch(undefined),
});

export const Route = createFileRoute("/reports")({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const status = deps.status ?? "all";
    const [{ reports, admin }, { lines }] = await Promise.all([
      getReports({
        data: {
          lineId: deps.line,
          status: status === "all" ? undefined : status,
        },
      }),
      getNetwork(),
    ]);
    return { reports, admin, lines };
  },
  head: () => ({ meta: [{ title: "Reports · Transit Tracker" }] }),
  component: Reports,
});

const ALL = "all";

function Reports() {
  const { reports, admin, lines } = Route.useLoaderData();
  const { line, status } = Route.useSearch();
  const navigate = useNavigate({ from: "/reports" });
  const filtered = Boolean(line) || Boolean(status);

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader title="Reports" />
      <div className="flex flex-wrap gap-2">
        <Picker
          testId="report-line-filter"
          label="Line"
          className="w-56"
          value={line ?? ALL}
          onChange={(value) =>
            navigate({
              search: (prev) => ({
                ...prev,
                line: value === ALL ? undefined : value,
              }),
            })
          }
          items={[
            { value: ALL, label: "All lines" },
            ...lines.map((item) => ({
              value: item.id,
              label: `${item.code} ${item.fromName} – ${item.toName}`,
            })),
          ]}
        />
        <Picker
          testId="report-status-filter"
          label="Status"
          className="w-40"
          value={status ?? ALL}
          onChange={(value) =>
            navigate({
              search: (prev) => ({
                ...prev,
                status:
                  value === ALL ? undefined : (value as "open" | "resolved"),
              }),
            })
          }
          items={[
            { value: "open", label: "Open" },
            { value: "resolved", label: "Resolved" },
            { value: ALL, label: "All statuses" },
          ]}
        />
      </div>
      {reports.length ? (
        <ReportList reports={reports} admin={admin} />
      ) : filtered ? (
        <EmptyState kind="filtered" title="No reports match" />
      ) : (
        <EmptyState
          title="No reports yet"
          description="Reports sent from a line's page appear here."
        />
      )}
    </AppShell>
  );
}
