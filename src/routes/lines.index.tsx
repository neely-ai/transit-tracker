import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { LineBadge } from "@/client/components/LineBadge";
import { PageHeader } from "@/client/components/PageHeader";
import { Picker } from "@/client/components/Picker";
import { StarButton } from "@/client/components/LineBits";
import { ScopeToggle, type Scope } from "@/client/components/ScopeToggle";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { getNetwork } from "@/serverFunctions/network";
import {
  KIND_LABELS,
  LINE_KINDS,
  lineName,
  type LineKind,
} from "@/shared/network";

export const Route = createFileRoute("/lines/")({
  loader: () => getNetwork(),
  head: () => ({ meta: [{ title: "Lines · Transit Tracker" }] }),
  component: Lines,
});

const ALL_KINDS = "all";

function Lines() {
  const { lines, admin } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<string>(ALL_KINDS);
  const [scope, setScope] = useState<Scope>("all");

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return lines.filter(
      (line) =>
        (scope === "all" || line.favorite) &&
        (kind === ALL_KINDS || line.kind === kind) &&
        (!needle ||
          line.code.toLowerCase().includes(needle) ||
          lineName(line).toLowerCase().includes(needle)),
    );
  }, [lines, query, kind, scope]);

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader
        title="Lines"
        description={`${lines.length} ${lines.length === 1 ? "line" : "lines"}`}
        actions={
          admin ? (
            <Button
              data-testid="new-line"
              render={<Link to="/lines/new" />}
              nativeButton={false}
            >
              <Plus data-icon="inline-start" />
              New line
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="line-search"
            aria-label="Search lines"
            placeholder="Code or terminal"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Picker
          testId="kind-filter"
          label="Kind"
          className="w-36"
          value={kind}
          onChange={setKind}
          items={[
            { value: ALL_KINDS, label: "All kinds" },
            ...LINE_KINDS.map((value) => ({
              value,
              label: KIND_LABELS[value],
            })),
          ]}
        />
        <ScopeToggle value={scope} onChange={setScope} />
      </div>
      {shown.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {shown.map((line) => (
            <li
              key={line.id}
              data-testid="line-row"
              className="flex items-center gap-3 px-4 py-3"
            >
              <LineBadge line={line} />
              <div className="min-w-0 flex-1">
                <Link
                  to="/lines/$lineId"
                  params={{ lineId: line.id }}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {lineName(line)}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{KIND_LABELS[line.kind as LineKind] ?? line.kind}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {line.stationCount}{" "}
                    {line.stationCount === 1 ? "station" : "stations"}
                  </span>
                </div>
              </div>
              <StarButton line={line} />
            </li>
          ))}
        </ul>
      ) : lines.length === 0 ? (
        <EmptyState
          title="No lines yet"
          description={
            admin
              ? "Add your first line and its stations."
              : "An admin adds the network's lines."
          }
        />
      ) : scope === "mine" && !query && kind === ALL_KINDS ? (
        <EmptyState
          title="No starred lines"
          description="Star up to 5 lines to keep them here."
          icon={Star}
        />
      ) : (
        <EmptyState kind="filtered" title="No lines match" />
      )}
    </AppShell>
  );
}
