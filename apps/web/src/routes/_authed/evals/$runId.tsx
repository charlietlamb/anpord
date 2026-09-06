import { createFileRoute, Outlet } from "@tanstack/react-router";
import { evalQueries } from "@/lib/evals/eval-queries";
import { shortId } from "@/lib/evals/short-id";

export const Route = createFileRoute("/_authed/evals/$runId")({
  ssr: false,
  /* Ensured rather than prefetched: every screen under this route reads the
     same run, and the breadcrumb reads it synchronously from the cache. */
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(evalQueries.detail(params.runId)),
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
