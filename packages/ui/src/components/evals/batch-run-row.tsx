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

export type RunLink = (target: {
  readonly caseId: string;
  readonly runId: string;
}) => ReactElement;

/* A run is worth opening from the moment it starts, before it has opened a
   trial, so a running row falls back to the run itself rather than going dead. */
const destination = (
  run: EvalRun,
  linkTo: TrialLink | undefined,
  runLinkTo: RunLink | undefined
) => {
  const trial = run.trials.at(0);

  if (trial !== undefined && linkTo !== undefined) {
    return linkTo({ caseId: run.case.id, trialId: trial.id });
  }

  return runLinkTo?.({ caseId: run.case.id, runId: run.id });
};

export function BatchRunRow({
  linkTo,
  run,
  runLinkTo,
}: {
  readonly linkTo?: TrialLink;
  readonly run: EvalRun;
  readonly runLinkTo?: RunLink;
}) {
  const opensAt = destination(run, linkTo, runLinkTo);
  const opens = opensAt !== undefined;

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

  if (opensAt === undefined) {
    return <DataTableRow>{body}</DataTableRow>;
  }

  return <DataTableRow render={opensAt}>{body}</DataTableRow>;
}
