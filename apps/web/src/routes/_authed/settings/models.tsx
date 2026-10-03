import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/settings/models")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/environment" });
  },
});
