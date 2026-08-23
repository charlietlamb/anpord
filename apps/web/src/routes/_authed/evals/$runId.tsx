import { createFileRoute, Outlet } from "@tanstack/react-router";
import { evalQueries } from "@/lib/evals/eval-queries";
import { shortId } from "@/lib/evals/short-id";

export const Route = createFileRoute("/_authed/evals/$runId")({
  ssr: false,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(evalQueries.detail(params.runId)),
  component: RunLayout,
  staticData: {
    crumb: (params, queryClient) => {
      const run = queryClient.getQueryData(
        evalQueries.detail(params.runId).queryKey
      );

      if (run === undefined) {
        return shortId(params.runId);
      }

      /* Named by what it tested rather than by its id: a person recognises
         `fib` and reads a ULID twice. The id stays as the tiebreak, because a
         case run nine times gives nine crumbs that are otherwise identical. */
      const name = run.cases[0] ?? shortId(run.id);

      return run.cases.length > 1
        ? `${name} +${run.cases.length - 1}`
        : `${name} ${shortId(run.id)}`;
    },
    title: "Run",
  },
});

function RunLayout() {
  return <Outlet />;
}
