import { Button } from "@anpord/ui/components/button";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { ArrowSquareOutIcon, FlaskIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CaseRail } from "@/components/evals/case-rail";
import { CaseReadings } from "@/components/evals/case-readings";
import { CaseSkeleton } from "@/components/evals/case-skeleton";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/cases/$caseId")({
  ssr: false,
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(evalQueries.case(params.caseId));
  },
  component: CaseScreen,
  staticData: {
    crumb: (params, queryClient) =>
      queryClient.getQueryData(evalQueries.case(params.caseId).queryKey)?.name,
    title: "Case",
  },
});

function CaseScreen() {
  const { caseId } = Route.useParams();
  const { data, error } = useQuery(evalQueries.case(caseId));

  if (error) {
    return (
      <ErrorCard description={error.message} title="Could not load this case" />
    );
  }

  if (data === undefined) {
    return <CaseSkeleton />;
  }

  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <PageHeading icon={FlaskIcon} title={data.name} />

            <Button
              render={
                <Link
                  params={{ cellKey: data.cellKey, runId: data.lastRunId }}
                  to="/evals/$runId/cells/$cellKey"
                />
              }
              size="sm"
              variant="outline"
            >
              <ArrowSquareOutIcon className="size-3.5" />
              Newest run
            </Button>
          </div>

          <CaseReadings cellKey={data.cellKey} entries={data.history} />
        </section>
      </EvalMain>

      <CaseRail subject={data} />
    </EvalLayout>
  );
}
