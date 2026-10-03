import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/settings/harnesses")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/environment" });
  },
});
