import type { EvalCaseSummary } from "@anpord/schema/domain/evals";
import {
  DataTableChevron,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { Link } from "@tanstack/react-router";
import { AgeCell } from "@/components/evals/age-cell";
import { EvalStatusBadge } from "@/components/evals/eval-status-badge";
import { TagChip } from "@/components/evals/tag-chip";
import { VariantCell } from "@/components/evals/variant-cell";
import { counted } from "@/lib/evals/conversation";
import { distributionStatus } from "@/lib/evals/eval-status";

export function CaseListRow({
  subject,
}: {
  readonly subject: EvalCaseSummary;
}) {
  return (
    <DataTableRow
      render={
        <Link params={{ caseId: subject.caseId }} to="/evals/cases/$caseId" />
      }
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-foreground">{subject.name}</span>
        {subject.tags.map((tag) => (
          <TagChip key={tag} tag={tag} />
        ))}
      </span>

      <VariantCell harness={subject.harness} model={subject.model} />

      <span>
        <EvalStatusBadge status={distributionStatus(subject.distribution)} />
      </span>

      <span className="text-muted-foreground tabular-nums">
        {counted(subject.runCount, "run", "runs")}
      </span>

      <AgeCell at={subject.lastRunAtMillis} />

      <DataTableChevron />
    </DataTableRow>
  );
}
