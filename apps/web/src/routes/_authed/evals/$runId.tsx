import { createFileRoute, Outlet } from "@tanstack/react-router";
import { evalQueries } from "@/lib/evals/eval-queries";
import { runLabel } from "@/lib/evals/run-label";
import { shortId } from "@/lib/evals/short-id";

export const Route = createFileRoute("/_authed/evals/$runId")({
  ssr: false,
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(evalQueries.detail(params.runId)),
  component: RunLayout,
  staticData: {
    crumb: (params, queryClient) => {
      const run = queryClient.getQueryData(
        evalQueries.detail(params.runId).queryKey
      );

      if (run === undefined) {
        return shortId(params.runId);
      }

      /* Older runs predate persisted eval names, so retain their recognizable
         case-based label rather than replacing it with an opaque id. */
      return runLabel(run);
    },
    title: "Run",
  },
});

function RunLayout() {
  return <Outlet />;
}
