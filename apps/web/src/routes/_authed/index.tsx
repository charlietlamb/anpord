import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/page-shell";

export const Route = createFileRoute("/_authed/")({
  component: Overview,
  staticData: { title: "Overview" },
});

function Overview() {
  return (
    <PageShell>
      <p className="text-muted-foreground text-sm">Your workspace is ready.</p>
    </PageShell>
  );
}
