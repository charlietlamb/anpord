import type { EvalRunSummary } from "@anpord/schema/domain/evals";
import { RunStatusBadge } from "@/components/evals/eval-status-badge";
import {
  CommandSpread,
  OutcomeSummary,
} from "@/components/evals/outcome-summary";
import { ListRow } from "@/components/layout/list-row";
import { useRelativeTime } from "@/lib/use-relative-time";

const durationOf = (run: EvalRunSummary) => {
  if (run.finishedAt === null) {
    return null;
  }

  const seconds = Math.round(
    (run.finishedAt.epochMillis - run.startedAt.epochMillis) / 1000
  );

  return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`;
};

export function EvalRow({ run }: { readonly run: EvalRunSummary }) {
  const started = useRelativeTime(new Date(run.startedAt.epochMillis));
  const took = durationOf(run);

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
        {/* 13px, matching every other row in the app: the name is what a
            reader scans for, not a heading. */}
        <span className="font-medium text-foreground text-label">
          {run.name ?? run.id}
        </span>
        <span className="ml-2.5 text-muted-foreground/70 text-xs">
          {run.caseCount} × {run.taskCount}
        </span>
      </ListRow>

      {/* A second line, because `ListRow` is one by design and widening a
          shared primitive for one caller would cost every other list. 127
          runs carry the same long sentence, so it wraps rather than
          truncates. */}
      {run.failure === null ? null : (
        <p className="text-pretty pb-1 pl-9 text-muted-foreground text-xs">
          {run.failure}
        </p>
      )}
    </div>
  );
}
