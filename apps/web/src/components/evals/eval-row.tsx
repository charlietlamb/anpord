import type { EvalRunSummary } from "@anpord/schema/domain/evals";
import { RunStatusIcon } from "@/components/evals/eval-status-badge";
import { OutcomeSummary } from "@/components/evals/outcome-summary";
import { RunTrigger } from "@/components/evals/run-trigger";
import { SignalTip } from "@/components/evals/signal-tip";
import { VariantMarks } from "@/components/evals/variant-marks";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { clock, elapsed, exactly } from "@/lib/evals/duration";
import { useShortAge } from "@/lib/use-relative-time";

export function EvalRow({ run }: { readonly run: EvalRunSummary }) {
  const startedAt = new Date(run.startedAt.epochMillis);
  const age = useShortAge(startedAt);
  const finishedAt = run.finishedAt?.epochMillis ?? null;
  const took = elapsed(run.startedAt.epochMillis, finishedAt);

  return (
    <ListRow
      leading={<RunStatusIcon failure={run.failure} status={run.status} />}
      meta={
        <>
          <span className="flex w-20 justify-end text-xs">
            <RunTrigger trigger={run.trigger} />
          </span>
          <span className="flex w-20 justify-end">
            <VariantMarks columns={run.columns} />
          </span>

          <span className="flex w-16 justify-end">
            <OutcomeSummary
              passed={run.passed}
              scored={run.scored}
              voided={run.voided}
            />
          </span>

          <span className="flex w-12 justify-end">
            {took === null ? null : (
              <SignalTip
                className="whitespace-nowrap tabular-nums"
                label={`Ran for ${exactly(run.startedAt.epochMillis, finishedAt)}`}
              >
                {took}
              </SignalTip>
            )}
          </span>

          {/* "ago" separates this age from the duration column beside it. */}
          <span className="flex w-16 justify-end">
            {age === null ? null : (
              <SignalTip
                className="whitespace-nowrap tabular-nums"
                label={`Started ${clock(run.startedAt.epochMillis)}`}
              >
                {age} ago
              </SignalTip>
            )}
          </span>
        </>
      }
      params={{ runId: run.id }}
      to="/evals/$runId"
    >
      <RowTitle>{run.name ?? run.firstCaseName ?? run.id}</RowTitle>

      {run.caseCount > 1 ? (
        <SignalTip
          className="ml-2 text-muted-foreground/60 text-xs tabular-nums"
          label={`${run.caseCount} cases`}
        >
          ×{run.caseCount}
        </SignalTip>
      ) : null}
    </ListRow>
  );
}
