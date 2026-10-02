import type { EvalTrialAddress } from "@sphynx/schema/domain/eval-read-models";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TrialPlaceholder } from "@/components/evals/trial-placeholder";
import { TrialScreen } from "@/components/evals/trial-screen";
import { ErrorCard } from "@/components/layout/error-card";
import { evalKeys } from "@/lib/evals/eval-keys";
import { evalQueries } from "@/lib/evals/eval-queries";
import { crumbFrom } from "@/lib/use-breadcrumbs";

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
    crumb: (params) =>
      crumbFrom(
        evalKeys.trialAddress(params.trialId),
        (address: EvalTrialAddress) => `Trial ${address.ordinal}`
      ),
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
