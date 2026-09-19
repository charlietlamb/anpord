import { createFileRoute, redirect } from "@tanstack/react-router";

/* Kept so already-published links to Settings > Judges still resolve. */
export const Route = createFileRoute("/_authed/settings/judges")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/models" });
  },
});
