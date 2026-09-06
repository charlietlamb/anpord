import { createFileRoute, redirect } from "@tanstack/react-router";

/* Kept so already-published links to Settings > Connections still resolve. */
export const Route = createFileRoute("/_authed/settings/connections")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/harnesses" });
  },
});
