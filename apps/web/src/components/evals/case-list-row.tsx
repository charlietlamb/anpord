import { type EvalCaseSummary, tallyOf } from "@anpord/schema/domain/evals";
import { AgeCell } from "@anpord/ui/components/evals/age-cell";
import { EvalStatusBadge } from "@anpord/ui/components/evals/eval-status-badge";
import {
  DataTableChevron,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { distributionStatus } from "@anpord/ui/lib/evals/eval-status";
import { Link } from "@tanstack/react-router";
import { TagChip } from "@/components/evals/tag-chip";
import { counted } from "@/lib/evals/conversation";

export function CaseListRow({
  subject,
}: {
  readonly subject: EvalCaseSummary;
}) {
  const runs = subject.variants.reduce((total, entry) => total + entry.runs, 0);

  return (
    <DataTableRow
      render={
        <Link params={{ caseId: subject.id }} to="/evals/cases/$caseId" />
      }
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-foreground">{subject.name}</span>
        {subject.tags.map((tag) => (
          <TagChip key={tag} tag={tag} />
        ))}
      </span>

      <span className="truncate text-muted-foreground">
        {subject.suite.name}
      </span>

      <span className="text-muted-foreground tabular-nums">
        {counted(subject.variants.length, "variant", "variants")}
      </span>

      <span>
        <EvalStatusBadge
          status={distributionStatus(
            tallyOf(subject.variants.map((entry) => entry.distribution))
          )}
        />
      </span>

      <span className="text-muted-foreground tabular-nums">
        {counted(runs, "run", "runs")}
      </span>

      <AgeCell at={subject.lastRunAt.epochMillis} />

      <DataTableChevron />
    </DataTableRow>
  );
}
