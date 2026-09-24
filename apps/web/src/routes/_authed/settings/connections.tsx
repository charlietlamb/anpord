import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/settings/connections")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/harnesses" });
  },
});
