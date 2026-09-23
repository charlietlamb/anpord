import { createFileRoute } from "@tanstack/react-router";
import { redirectFromRun } from "@/lib/evals/run-redirect";

export const Route = createFileRoute("/_authed/evals/$runId/")({
  ssr: false,
  loader: ({ params }) => redirectFromRun(params.runId),
});
