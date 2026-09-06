import { createFileRoute, redirect } from "@tanstack/react-router";
import { Landing } from "@/components/landing/landing";

export const Route = createFileRoute("/_authed/")({
  beforeLoad: ({ context }) => {
    if (context.authenticated) {
      throw redirect({ to: "/evals" });
    }
  },
  component: Landing,
});
