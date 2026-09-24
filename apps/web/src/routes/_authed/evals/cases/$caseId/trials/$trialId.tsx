import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TrialPlaceholder } from "@/components/evals/trial-placeholder";
import { TrialScreen } from "@/components/evals/trial-screen";
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

    context.queryClient.prefetchQuery(evalQueries.run(address.runId));
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
    return <TrialPlaceholder />;
  }

  return <TrialScreen address={address} />;
}
