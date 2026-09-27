import { StackIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { SuiteListRow } from "@/components/evals/suite-list-row";
import { SummaryTable } from "@/components/evals/summary-table";
import { CursorPagination } from "@/components/layout/cursor-pagination";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";
import { SUITES_TABLE } from "@/lib/evals/case-tables";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useSuiteList } from "@/lib/evals/use-suite-list";

export const Route = createFileRoute("/_authed/evals/suites/")({
  ssr: false,
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(evalQueries.suites());
  },
  component: SuitesIndex,
  staticData: { title: "Suites" },
});

function SuitesIndex() {
  const { error, loading, paging, suites } = useSuiteList();

  return (
    <PageShell
      description="The prompt and workspace a group of cases share."
      title="Suites"
      width="wide"
    >
      <ListState
        description="Start an eval and the suite it belongs to appears here."
        empty={suites.length === 0}
        error={error}
        icon={<StackIcon />}
        loading={loading}
        title="No suites yet"
      >
        <SummaryTable
          items={suites}
          pagination={<CursorPagination {...paging} />}
          row={(suite) => <SuiteListRow key={suite.id} suite={suite} />}
          table={SUITES_TABLE}
        />
      </ListState>
    </PageShell>
  );
}
