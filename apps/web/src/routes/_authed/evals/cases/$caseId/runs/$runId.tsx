import { createFileRoute } from "@tanstack/react-router";
import { RunScreen } from "@/components/evals/run-screen";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute(
  "/_authed/evals/cases/$caseId/runs/$runId"
)({
  ssr: false,
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(evalQueries.run(params.runId));
  },
  component: RunRoute,
  staticData: {
    title: "Run",
  },
});

function RunRoute() {
  const { caseId, runId } = Route.useParams();

  return <RunScreen caseId={caseId} runId={runId} />;
}
