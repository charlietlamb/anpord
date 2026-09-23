import type { EvalPageCursor } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
  DataTableSkeleton,
} from "@anpord/ui/components/ui/data-table";
import { FlaskIcon, PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CaseListRow } from "@/components/evals/case-list-row";
import { TagFilter } from "@/components/evals/tag-filter";
import { CursorPagination } from "@/components/layout/cursor-pagination";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";
import { CASES_TABLE } from "@/lib/evals/case-tables";
import { counted } from "@/lib/evals/conversation";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useCursorStack } from "@/lib/use-cursor-stack";

export const Route = createFileRoute("/_authed/evals/")({
  validateSearch: (search): { tag?: string } =>
    typeof search.tag === "string" && search.tag !== ""
      ? { tag: search.tag }
      : {},
  ssr: false,
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(evalQueries.cases(null));
  },
  component: EvalsIndex,
});

function EvalsIndex() {
  const navigate = Route.useNavigate();
  const { tag = null } = Route.useSearch();
  const pages = useCursorStack<EvalPageCursor>();
  const { data, error, isPending, isPlaceholderData } = useQuery(
    evalQueries.cases(tag, pages.cursor)
  );
  const cases = data?.cases ?? [];
  const next = data?.next ?? null;

  return (
    <PageShell
      actions={
        <Button render={<Link to="/evals/new" />} size="sm">
          <PlusIcon className="size-3.5" />
          New eval
        </Button>
      }
      tabs={
        <TagFilter
          onSelect={(selected) => {
            pages.reset();
            navigate({ search: { tag: selected ?? undefined } });
          }}
          selected={tag}
          tags={data?.tags ?? []}
        />
      }
      title="Evals"
      width="wide"
    >
      <ListState
        description="Run an eval and the cases it measures appear here."
        empty={cases.length === 0}
        error={error}
        icon={<FlaskIcon size={20} />}
        isPending={isPending}
        skeleton={<DataTableSkeleton {...CASES_TABLE} />}
        title={tag === null ? "No cases yet" : `Nothing tagged ${tag}`}
      >
        <DataTable columns={CASES_TABLE.columns} label={CASES_TABLE.label}>
          <DataTableHead headings={CASES_TABLE.headings} />

          <DataTableBody>
            {cases.map((subject) => (
              <CaseListRow key={subject.caseId} subject={subject} />
            ))}
          </DataTableBody>

          <DataTableFooter
            actions={
              <CursorPagination
                canGoNext={next !== null}
                canGoPrev={pages.page > 1}
                disabled={isPlaceholderData}
                onNext={() => {
                  if (next !== null) {
                    pages.push(next);
                  }
                }}
                onPrev={pages.pop}
                page={pages.page}
              />
            }
          >
            Showing {counted(cases.length, "case", "cases")}
          </DataTableFooter>
        </DataTable>
      </ListState>
    </PageShell>
  );
}
