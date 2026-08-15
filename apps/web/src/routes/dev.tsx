import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

/**
 * Component previews. Guarded rather than deleted at build time so the route
 * simply does not exist in production.
 */
export const Route = createFileRoute("/dev")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw notFound();
    }
  },
  component: () => <Outlet />,
});
