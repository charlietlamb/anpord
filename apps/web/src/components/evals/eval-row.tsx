import type { EvalRunSummary } from "@anpord/schema/domain/evals";
import { RunStatusBadge } from "@/components/evals/eval-status-badge";
import {
  CommandSpread,
  OutcomeSummary,
} from "@/components/evals/outcome-summary";
import { ListRow } from "@/components/layout/list-row";
import { elapsed } from "@/lib/evals/duration";
import { useRelativeTime } from "@/lib/use-relative-time";

export function EvalRow({ run }: { readonly run: EvalRunSummary }) {
  const started = useRelativeTime(new Date(run.startedAt.epochMillis));
  const took = elapsed(
    run.startedAt.epochMillis,
    run.finishedAt?.epochMillis ?? null
  );

  return (
    <div>
      <ListRow
        leading={<RunStatusBadge status={run.status} />}
        meta={
          <>
            <OutcomeSummary
              passed={run.passed}
              scored={run.scored}
              voided={run.voided}
            />
            <CommandSpread max={run.commandMax} min={run.commandMin} />
            <span className="w-10 text-right">{took ?? ""}</span>
            <span className="w-20 whitespace-nowrap text-right">{started}</span>
          </>
        }
        params={{ runId: run.id }}
        to="/evals/$runId"
      >
        <span className="font-medium text-foreground text-label">
          {run.name ?? run.id}
        </span>
        <span className="ml-2.5 text-muted-foreground/70 text-xs">
          {run.caseCount} × {run.taskCount}
        </span>
      </ListRow>

      {run.failure === null ? null : (
        <p className="text-pretty pb-1 pl-9 text-muted-foreground text-xs">
          {run.failure}
        </p>
      )}
    </div>
  );
}
