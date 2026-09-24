import { DataTableSkeleton } from "@anpord/ui/components/ui/data-table";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CaseActions } from "@/components/evals/case-actions";
import { CaseActivity } from "@/components/evals/case-activity";
import { CaseMeta } from "@/components/evals/case-meta";
import { ErrorCard } from "@/components/layout/error-card";
import { PageShell } from "@/components/layout/page-shell";
import { CASE_RUNS_TABLE } from "@/lib/evals/case-tables";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/cases/$caseId/")({
  ssr: false,
  component: CaseScreen,
});

function CaseScreen() {
  const { caseId } = Route.useParams();
  const { data, error } = useQuery(evalQueries.case(caseId));

  if (error) {
    return (
      <ErrorCard description={error.message} title="Could not load this case" />
    );
  }

  return (
    <PageShell
      actions={data === undefined ? null : <CaseActions detail={data} />}
      description={data === undefined ? undefined : <CaseMeta subject={data} />}
      title={data?.name ?? caseId}
      width="wide"
    >
      {data === undefined ? (
        <DataTableSkeleton {...CASE_RUNS_TABLE} />
      ) : (
        <CaseActivity detail={data} />
      )}
    </PageShell>
  );
}
