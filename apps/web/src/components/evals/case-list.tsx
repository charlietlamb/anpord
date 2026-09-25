import type { EvalCaseSummary } from "@anpord/schema/domain/evals";
import { GaugeIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { CasesTable } from "@/components/evals/cases-table";
import { CursorPagination } from "@/components/layout/cursor-pagination";
import { ListState } from "@/components/layout/list-state";

const emptyCopy = (narrowed: boolean) =>
  narrowed
    ? {
        description: "Try a different search, suite or tag.",
        title: "No cases match",
      }
    : {
        description: "Run an eval and the cases it measures appear here.",
        title: "No cases yet",
      };

export function CaseList({
  cases,
  error,
  loading,
  narrowed = false,
  paging,
}: {
  readonly cases: readonly EvalCaseSummary[];
  readonly error: Error | null;
  readonly loading: boolean;
  readonly narrowed?: boolean;
  readonly paging: ComponentProps<typeof CursorPagination>;
}) {
  return (
    <ListState
      {...emptyCopy(narrowed)}
      empty={cases.length === 0}
      error={error}
      icon={<GaugeIcon />}
      loading={loading}
    >
      <CasesTable cases={cases} pagination={<CursorPagination {...paging} />} />
    </ListState>
  );
}
