import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

/* Guarded rather than removed at build time, so the route 404s in production. */
export const Route = createFileRoute("/dev")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw notFound();
    }
  },
  component: () => <Outlet />,
});
