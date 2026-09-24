import { SkeletonScope } from "@anpord/ui/components/ui/skeleton-scope";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CaseActions } from "@/components/evals/case-actions";
import { CaseActivity } from "@/components/evals/case-activity";
import { CaseMeta } from "@/components/evals/case-meta";
import { CaseRuns } from "@/components/evals/case-runs";
import { ErrorCard } from "@/components/layout/error-card";
import { PageShell } from "@/components/layout/page-shell";
import {
  PLACEHOLDER_CASE_DETAIL,
  PLACEHOLDER_RUN_PAGE,
} from "@/lib/evals/eval-placeholders";
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

  const detail = data ?? PLACEHOLDER_CASE_DETAIL;

  return (
    <SkeletonScope loading={data === undefined}>
      <PageShell
        actions={<CaseActions detail={detail} />}
        description={<CaseMeta subject={detail} />}
        title={detail.name}
        width="wide"
      >
        {data === undefined ? (
          <CaseRuns
            caseId={detail.id}
            onPage={() => undefined}
            page={PLACEHOLDER_RUN_PAGE}
          />
        ) : (
          <CaseActivity detail={data} />
        )}
      </PageShell>
    </SkeletonScope>
  );
}
