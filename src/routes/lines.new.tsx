import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { LineForm } from "@/client/components/LineForm";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { errorMessage } from "@/client/components/Reports";
import { createLine, getViewer } from "@/serverFunctions/network";

export const Route = createFileRoute("/lines/new")({
  loader: () => getViewer(),
  head: () => ({ meta: [{ title: "New line · Transit Tracker" }] }),
  component: NewLine,
});

function NewLine() {
  const { admin } = Route.useLoaderData();
  const navigate = useNavigate();
  return (
    <AppShell nav={<AppNav />}>
      <PageHeader
        title="New line"
        backLink={<BackLink to="/lines">Lines</BackLink>}
      />
      {admin ? (
        <LineForm
          submitLabel="Create line"
          onSubmit={async (values) => {
            try {
              const line = await createLine({ data: values });
              await navigate({
                to: "/lines/$lineId",
                params: { lineId: line.id },
              });
            } catch (error) {
              toast.error(errorMessage(error));
            }
          }}
        />
      ) : (
        <EmptyState kind="error" title="Only admins can add lines" />
      )}
    </AppShell>
  );
}
