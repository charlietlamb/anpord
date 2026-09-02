import type { EvalRunSummary } from "@anpord/schema/domain/evals";
import { RunStatusIcon } from "@/components/evals/eval-status-badge";
import { OutcomeSummary } from "@/components/evals/outcome-summary";
import { SignalTip } from "@/components/evals/signal-tip";
import { VariantMarks } from "@/components/evals/variant-marks";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { clock, elapsed, exactly } from "@/lib/evals/duration";
import { useShortAge } from "@/lib/use-relative-time";

/**
 * One run, as a row.
 *
 * Each fact holds its own width so a column forms down the list: left to
 * natural widths, `1/1` and `·` land wherever the value above them ended, and
 * nothing lines up.
 *
 * Every figure is the short form, because the column repeats it on each row
 * and the words between them never vary. What each one leaves out waits in a
 * tooltip rather than being lost.
 */
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
          <span className="flex w-20 justify-end">
            <VariantMarks columns={run.columns} />
          </span>

          {/* The arc holds the whole outcome; the counts are in its tooltip.
              A void-only run writes "9 void" here instead. */}
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

          {/* "ago" because the column beside it is also a length of time:
              1m and 8h are a duration and an age, and only the word separates
              them. */}
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

      {/* The unit once, on the count itself: a column of "3 cases" repeats a
          word that never varies, and the number is the part that differs. */}
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
