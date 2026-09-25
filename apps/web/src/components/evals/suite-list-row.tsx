import type { EvalSuiteSummary } from "@anpord/schema/domain/evals";
import { AgeCell } from "@anpord/ui/components/evals/age-cell";
import { EvalStatusBadge } from "@anpord/ui/components/evals/eval-status-badge";
import {
  DataTableChevron,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { distributionStatus } from "@anpord/ui/lib/evals/eval-status";
import { Link } from "@tanstack/react-router";
import { counted } from "@/lib/evals/conversation";

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
