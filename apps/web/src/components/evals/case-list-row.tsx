import type { EvalCaseSummary } from "@anpord/schema/domain/evals";
import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { CaretRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AgeCell } from "@/components/evals/age-cell";
import { DistributionPill } from "@/components/evals/eval-status-badge";
import { TagChip } from "@/components/evals/tag-chip";
import { counted } from "@/lib/evals/conversation";
import { harnessPresentation } from "@/lib/evals/variant-presentation";

export function CaseListRow({
  subject,
}: {
  readonly subject: EvalCaseSummary;
}) {
  const harness = harnessPresentation(subject.harness);

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

      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <harness.Icon
          aria-label={harness.label}
          className="size-3.5 shrink-0"
        />
        <span className="truncate">{subject.model}</span>
      </span>

      <span>
        <DistributionPill distribution={subject.distribution} />
      </span>

      <span className="text-muted-foreground tabular-nums">
        {counted(subject.runCount, "run", "runs")}
      </span>

      <AgeCell at={subject.lastRunAtMillis} />

      <CaretRightIcon
        aria-hidden="true"
        className="size-3.5 text-muted-foreground"
      />
    </DataTableRow>
  );
}
