import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TrialScreen } from "@/components/evals/trial-screen";
import { TrialSkeleton } from "@/components/evals/trial-skeleton";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute(
  "/_authed/evals/cases/$caseId/trials/$trialId"
)({
  ssr: false,
  loader: async ({ context, params }) => {
    const address = await context.queryClient.ensureQueryData(
      evalQueries.trialAddress(params.trialId)
    );

    context.queryClient.prefetchQuery(evalQueries.detail(address.runId));
  },
  component: TrialRoute,
  staticData: {
    crumb: (params, queryClient) => {
      const address = queryClient.getQueryData(
        evalQueries.trialAddress(params.trialId).queryKey
      );

      return address === undefined ? undefined : `Trial ${address.ordinal}`;
    },
    title: "Trial",
  },
});

function TrialRoute() {
  const { trialId } = Route.useParams();
  const { data: address, error } = useQuery(evalQueries.trialAddress(trialId));

  if (error) {
    return (
      <ErrorCard
        description={error.message}
        title="Could not load this trial"
      />
    );
  }

  if (address === undefined) {
    return <TrialSkeleton />;
  }

  return (
    <TrialScreen
      caseId={address.caseId}
      cellKey={address.cellKey}
      ordinal={String(address.ordinal)}
      runId={address.runId}
    />
  );
}
