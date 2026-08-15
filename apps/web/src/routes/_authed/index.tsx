import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/")({
  component: Overview,
  staticData: { title: "Overview" },
});

function Overview() {
  return (
    <div className="flex flex-1 flex-col gap-2 p-6">
      <h1 className="font-heading text-2xl tracking-tight">Overview</h1>
      <p className="text-muted-foreground text-sm">Your workspace is ready.</p>
    </div>
  );
}
