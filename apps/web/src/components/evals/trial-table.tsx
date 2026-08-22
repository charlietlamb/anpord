import type { EvalTrial } from "@anpord/schema/domain/evals";
import { Badge } from "@anpord/ui/components/ui/badge";
import { useNavigate } from "@tanstack/react-router";
import { TrialStatusBadge } from "@/components/evals/eval-status-badge";
import { count, NOTHING, seconds } from "@/lib/evals/duration";

/** -1 is the sentinel a trial nothing decided carries. Shown as a word,
 * because a reader seeing "-1" would take it for an exit code. */
const exitOf = (trial: EvalTrial) =>
  trial.exitCode === -1 ? "undecided" : String(trial.exitCode);

const HEAD = "h-8 px-3 font-medium text-xs text-muted-foreground";
const CELL = "h-8 px-3 text-xs tabular-nums";

export function TrialTable({
  cellKey,
  runId,
  trials,
}: {
  readonly cellKey: string;
  readonly runId: string;
  readonly trials: readonly EvalTrial[];
}) {
  const navigate = useNavigate();

  const open = (ordinal: number) =>
    navigate({
      params: { cellKey, ordinal: String(ordinal), runId },
      to: "/evals/$runId/cells/$cellKey/trials/$ordinal",
    });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-border-faint border-b">
            <th className={`${HEAD} text-left`}>#</th>
            <th className={`${HEAD} text-left`}>verdict</th>
            <th className={`${HEAD} text-right`}>exit</th>
            <th className={`${HEAD} text-right`}>commands</th>
            <th className={`${HEAD} text-right`}>model</th>
            <th className={`${HEAD} text-right`}>sandbox</th>
            <th className={`${HEAD} text-right`}>tokens</th>
          </tr>
        </thead>

        <tbody>
          {trials.map((trial) => (
            <tr
              className="cursor-pointer hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
              key={trial.ordinal}
              onClick={() => open(trial.ordinal)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  open(trial.ordinal);
                }
              }}
              tabIndex={0}
            >
              <td className={CELL}>{trial.ordinal}</td>

              <td className="px-3 py-2">
                <TrialStatusBadge status={trial.status} />
              </td>

              <td className={`${CELL} text-right`}>{exitOf(trial)}</td>

              <td className={`${CELL} text-right`}>
                <span className="inline-flex items-center gap-1.5">
                  {trial.commands}
                  {trial.failedCommands > 0 ? (
                    <Badge
                      className="border-warning/25 bg-warning/10 font-medium text-warning"
                      size="xs"
                      variant="outline"
                    >
                      {trial.failedCommands} failed
                    </Badge>
                  ) : null}
                </span>
              </td>

              <td className={`${CELL} text-right`}>{seconds(trial.modelMs)}</td>
              <td className={`${CELL} text-right`}>
                {seconds(trial.sandboxMs)}
              </td>

              <td className={`${CELL} text-right`}>
                {trial.usage === null
                  ? NOTHING
                  : count(trial.usage.totalTokens)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
