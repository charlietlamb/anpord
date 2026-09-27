import { preloadable } from "@/lib/preloadable";

export const LazyDashboardShell = preloadable(() =>
  import("@/components/dashboard/dashboard-shell").then(
    (module) => module.DashboardShell
  )
);
