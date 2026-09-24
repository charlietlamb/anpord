import type { EvalCaseSummary } from "@anpord/schema/domain/evals";
import {
  DataTableChevron,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { Link } from "@tanstack/react-router";
import { EvalStatusBadge } from "@/components/evals/eval-status-badge";
import { TagChip } from "@/components/evals/tag-chip";
import { AgeCell } from "@/components/layout/age-cell";
import { counted } from "@/lib/evals/conversation";
import { distributionStatus } from "@/lib/evals/eval-status";

const newestAcross = (subject: EvalCaseSummary) =>
  subject.variants.reduce(
    (total, { distribution }) => ({
      passed: total.passed + distribution.passed,
      scored: total.scored + distribution.scored,
    }),
    { passed: 0, scored: 0 }
  );

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
        <EvalStatusBadge status={distributionStatus(newestAcross(subject))} />
      </span>

      <span className="text-muted-foreground tabular-nums">
        {counted(runs, "run", "runs")}
      </span>

      <AgeCell at={subject.lastRunAt.epochMillis} />

      <DataTableChevron />
    </DataTableRow>
  );
}
