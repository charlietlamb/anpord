import { createFileRoute } from "@tanstack/react-router";
import { redirectFromRun } from "@/lib/evals/run-redirect";

export const Route = createFileRoute("/_authed/evals/$runId/cells/$cellKey/")({
  ssr: false,
  loader: ({ params }) =>
    redirectFromRun(params.runId, { cellKey: params.cellKey }),
});
