import { Button } from "@anpord/ui/components/button";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import {
  ArrowSquareOutIcon,
  CubeIcon,
  FlaskIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CaseReadings } from "@/components/evals/case-readings";
import { EvalLayout, EvalMain, EvalRail } from "@/components/evals/eval-layout";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/cases/$caseId")({
  component: CaseScreen,
  ssr: false,
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(evalQueries.case(params.caseId));
  },
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
      <ErrorCard
        description={`No eval case with id "${caseId}".`}
        title="Case not found"
      />
    );
  }

  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <PageHeading icon={FlaskIcon} title={data?.name ?? caseId} />

            {data === undefined ? null : (
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
            )}
          </div>

          {data === undefined ? null : (
            <CaseReadings cellKey={data.cellKey} entries={data.history} />
          )}
        </section>
      </EvalMain>

      <EvalRail>
        <RailSection title="Case">
          <div className="flex flex-col">
            <RailFact
              hint="The handle this case keeps across every edit."
              label="id"
              value={caseId}
            />

            {data === undefined ? null : (
              <>
                <RailFact
                  Icon={TerminalWindowIcon}
                  label="harness"
                  value={data.harness}
                />
                <RailFact Icon={CubeIcon} label="model" value={data.model} />
              </>
            )}
          </div>
        </RailSection>

        {data === undefined || data.tags.length === 0 ? null : (
          <RailSection title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {data.tags.map((tag) => (
                <span
                  className="rounded-[3px] bg-alpha-4 px-1.5 py-0.5 text-muted-foreground text-xs"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          </RailSection>
        )}
      </EvalRail>
    </EvalLayout>
  );
}
