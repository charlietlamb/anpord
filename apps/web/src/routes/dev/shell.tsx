import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const Route = createFileRoute("/dev/shell")({
  component: ShellPreview,
  ssr: false,
  staticData: { title: "Evals" },
});

function ShellPreview() {
  return (
    <div className="flex h-svh">
      <DashboardShell sidebarOpen>
        <Outlet />
      </DashboardShell>
    </div>
  );
}
