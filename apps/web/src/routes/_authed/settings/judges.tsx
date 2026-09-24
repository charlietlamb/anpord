import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/settings/judges")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/models" });
  },
});
