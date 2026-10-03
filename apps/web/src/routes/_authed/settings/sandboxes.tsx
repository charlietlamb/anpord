import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/settings/sandboxes")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/environment" });
  },
});
