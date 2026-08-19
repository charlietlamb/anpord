import type { EvalTrial } from "@anpord/schema/domain/evals";
import { cn } from "@anpord/ui/lib/utils";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { TrialStatusBadge } from "@/components/evals/trial-status-badge";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/**
 * One trial, with the journal behind a disclosure.
 *
 * The exit code of every command the agent ran is the column an eval platform
 * reading a tool call cannot have, because the interface between an agent and
 * a sandbox hands back a string and a string cannot carry one. It is the
 * reason this screen exists, so it is one click away rather than absent.
 */
export function TrialRow({
  index,
  trial,
}: {
  readonly index: number;
  readonly trial: EvalTrial;
}) {
  const [open, setOpen] = useState(false);
  const hasJournal = trial.journal.length > 0;

  return (
    <div
      className="fade-in-0 slide-in-from-bottom-1 animate-in border-b ease-out [animation-duration:220ms] last:border-b-0"
      /* Staggered so a set of trials arrives as a cascade rather than a
         flash. Short enough that the last row is in before it reads as a
         wait. */
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <button
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
          hasJournal && "hover:bg-muted/50 active:bg-muted"
        )}
        disabled={!hasJournal}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <CaretRightIcon
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform duration-150 ease-out",
            open && "rotate-90",
            hasJournal ? "opacity-100" : "opacity-0"
          )}
        />

        <span className="w-16 shrink-0 text-muted-foreground tabular-nums">
          Trial {trial.ordinal}
        </span>

        <TrialStatusBadge status={trial.status} />

        <span className="ml-auto flex items-center gap-4 text-muted-foreground tabular-nums">
          <span>{trial.commands} commands</span>
          {trial.failedCommands > 0 ? (
            <span>{trial.failedCommands} failed on the way</span>
          ) : null}
          <span>{seconds(trial.modelMs)} model</span>
          <span>{seconds(trial.sandboxMs)} sandbox</span>
        </span>
      </button>

      {open && hasJournal ? (
        <div className="fade-in-0 slide-in-from-top-1 animate-in space-y-2 bg-muted/30 px-4 pt-1 pb-4 ease-out [animation-duration:180ms]">
          {trial.journal.map((command) => (
            <div
              className="rounded border bg-background p-3"
              /* The same command can run twice in one trial, so the exit code
                 and output are part of what makes a row distinct. */
              key={`${trial.ordinal}-${command.command}-${command.exitCode}-${command.output.length}`}
            >
              <div className="flex items-start gap-3">
                <code className="min-w-0 flex-1 break-all font-mono text-xs">
                  {command.command}
                </code>
                <span
                  className={cn(
                    "shrink-0 font-mono text-xs tabular-nums",
                    command.exitCode === 0
                      ? "text-muted-foreground"
                      : "text-destructive"
                  )}
                >
                  exit {command.exitCode ?? "?"}
                </span>
              </div>

              {command.output.trim() === "" ? null : (
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">
                  {command.output.slice(0, 2000)}
                </pre>
              )}
            </div>
          ))}

          {trial.filesChanged.length === 0 ? null : (
            <div className="text-muted-foreground text-xs">
              Changed {trial.filesChanged.join(", ")}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
