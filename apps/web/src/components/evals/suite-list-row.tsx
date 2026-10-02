import type { EvalSuiteSummary } from "@sphynx/schema/domain/eval-read-models";
import { AgeCell } from "@sphynx/ui/components/evals/age-cell";
import { EvalStatusBadge } from "@sphynx/ui/components/evals/eval-status-badge";
import {
  DataTableChevron,
  DataTableRow,
} from "@sphynx/ui/components/ui/data-table";
import { counted } from "@sphynx/ui/lib/evals/counted";
import { distributionStatus } from "@sphynx/ui/lib/evals/eval-status";
import { Link } from "@tanstack/react-router";

export function SuiteListRow({ suite }: { readonly suite: EvalSuiteSummary }) {
  return (
    <DataTableRow
      render={
        <Link params={{ suiteId: suite.id }} to="/evals/suites/$suiteId" />
      }
    >
      <span className="truncate text-foreground">{suite.name}</span>

      <span className="text-muted-foreground tabular-nums">
        {counted(suite.cases, "case", "cases")}
      </span>

      <span className="text-muted-foreground tabular-nums">
        {counted(suite.variants, "variant", "variants")}
      </span>

      <span>
        <EvalStatusBadge status={distributionStatus(suite.tally)} />
      </span>

      <AgeCell at={suite.lastRunAt?.epochMillis ?? null} />

      <DataTableChevron />
    </DataTableRow>
  );
}
