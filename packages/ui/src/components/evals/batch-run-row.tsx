import type { EvalRun } from "@anpord/schema/domain/evals";
import { AgeCell } from "@anpord/ui/components/evals/age-cell";
import { EvalStatusBadge } from "@anpord/ui/components/evals/eval-status-badge";
import { RunProgress } from "@anpord/ui/components/evals/run-progress";
import { VariantCell } from "@anpord/ui/components/evals/variant-cell";
import {
  DataTableChevron,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { runStatus } from "@anpord/ui/lib/evals/eval-status";
import type { ReactElement } from "react";

export type TrialLink = (target: {
  readonly caseId: string;
  readonly trialId: string;
}) => ReactElement;

const openable = (run: EvalRun) => run.trials.at(0);

export function BatchRunRow({
  linkTo,
  run,
}: {
  readonly linkTo?: TrialLink;
  readonly run: EvalRun;
}) {
  const trial = openable(run);
  const opens = trial !== undefined && linkTo !== undefined;

  const body = (
    <>
      <span className="truncate text-foreground">{run.case.name}</span>

      <VariantCell harness={run.variant.harness} model={run.variant.model} />

      <RunProgress run={run} />

      <span>
        <EvalStatusBadge status={runStatus(run)} />
      </span>

      <AgeCell at={(run.finishedAt ?? run.startedAt).epochMillis} />

      {/* A chevron on a row that does not open promises a click it cannot take. */}
      {opens ? <DataTableChevron /> : <span />}
    </>
  );

  if (trial === undefined || linkTo === undefined) {
    return <DataTableRow>{body}</DataTableRow>;
  }

  return (
    <DataTableRow render={linkTo({ caseId: run.case.id, trialId: trial.id })}>
      {body}
    </DataTableRow>
  );
}
