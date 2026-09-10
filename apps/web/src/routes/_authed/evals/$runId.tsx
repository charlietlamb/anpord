import { createFileRoute, Outlet } from "@tanstack/react-router";
import { evalQueries } from "@/lib/evals/eval-queries";
import { shortId } from "@/lib/evals/short-id";

export const Route = createFileRoute("/_authed/evals/$runId")({
  ssr: false,
  /* Prefetch without awaiting so each screen can render its own skeleton.
     The breadcrumb uses the run id until the query resolves. */
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(evalQueries.detail(params.runId));
  },
  component: RunLayout,
  staticData: {
    crumb: (params, queryClient) => {
      const run = queryClient.getQueryData(
        evalQueries.detail(params.runId).queryKey
      );

      const label = `Run ${shortId(params.runId)}`;
      return run?.name ? `${run.name} · ${label}` : label;
    },
    title: "Run",
  },
});

function RunLayout() {
  return <Outlet />;
}
