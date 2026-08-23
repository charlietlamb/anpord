import type { EvalRunSummary } from "@anpord/schema/domain/evals";
import { RunStatusIcon } from "@/components/evals/eval-status-badge";
import {
  CommandSpread,
  OutcomeSummary,
} from "@/components/evals/outcome-summary";
import { VariantMarks } from "@/components/evals/variant-marks";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { elapsed } from "@/lib/evals/duration";
import { useRelativeTime } from "@/lib/use-relative-time";

/**
 * One run, as a row.
 *
 * Each fact holds its own width so a column forms down the list: left to
 * natural widths, `1/1` and `·` land wherever the value above them ended, and
 * nothing lines up.
 */
export function EvalRow({ run }: { readonly run: EvalRunSummary }) {
  const started = useRelativeTime(new Date(run.startedAt.epochMillis));
  const took = elapsed(
    run.startedAt.epochMillis,
    run.finishedAt?.epochMillis ?? null
  );

  return (
    <ListRow
      leading={<RunStatusIcon failure={run.failure} status={run.status} />}
      meta={
        <>
          <span className="flex w-20 justify-end">
            <VariantMarks columns={run.columns} />
          </span>

          <span className="w-12 text-right">
            <OutcomeSummary
              passed={run.passed}
              scored={run.scored}
              voided={run.voided}
            />
          </span>

          <span className="w-20 text-right">
            <CommandSpread max={run.commandMax} min={run.commandMin} />
          </span>

          <span className="w-10 text-right">{took ?? ""}</span>
          <span className="w-20 whitespace-nowrap text-right">{started}</span>
        </>
      }
      params={{ runId: run.id }}
      to="/evals/$runId"
    >
      <RowTitle>{run.name ?? run.id}</RowTitle>

      {run.caseCount > 1 ? (
        <span className="ml-2.5 text-muted-foreground/70 text-xs tabular-nums">
          {run.caseCount} cases
        </span>
      ) : null}
    </ListRow>
  );
}
