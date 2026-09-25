import { SkeletonScope } from "@anpord/ui/components/ui/skeleton-scope";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CasesTable } from "@/components/evals/cases-table";
import { SuiteCases } from "@/components/evals/suite-cases";
import { SuiteMeta } from "@/components/evals/suite-meta";
import { SuiteSetup } from "@/components/evals/suite-setup";
import { ErrorCard } from "@/components/layout/error-card";
import { PageSection } from "@/components/layout/page-section";
import { PageShell } from "@/components/layout/page-shell";
import {
  PLACEHOLDER_CASE_PAGE,
  PLACEHOLDER_SUITE_DETAIL,
} from "@/lib/evals/eval-placeholders";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/suites/$suiteId")({
  ssr: false,
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(evalQueries.suite(params.suiteId));
  },
  component: SuiteScreen,
  staticData: {
    crumb: (params, queryClient) =>
      queryClient.getQueryData(evalQueries.suite(params.suiteId).queryKey)
        ?.name,
    title: "Suite",
  },
});

function SuiteScreen() {
  const { suiteId } = Route.useParams();
  const { data, error } = useQuery(evalQueries.suite(suiteId));

  if (error) {
    return (
      <ErrorCard
        description={error.message}
        title="Could not load this suite"
      />
    );
  }

  const suite = data ?? PLACEHOLDER_SUITE_DETAIL;

  return (
    <SkeletonScope loading={data === undefined}>
      <PageShell
        description={<SuiteMeta suite={suite} />}
        title={suite.name}
        width="wide"
      >
        <PageSection title="Setup">
          <SuiteSetup setup={suite.setup} />
        </PageSection>

        <PageSection title="Cases">
          {data === undefined ? (
            <CasesTable cases={PLACEHOLDER_CASE_PAGE.cases} pagination={null} />
          ) : (
            <SuiteCases suiteId={data.id} />
          )}
        </PageSection>
      </PageShell>
    </SkeletonScope>
  );
}
