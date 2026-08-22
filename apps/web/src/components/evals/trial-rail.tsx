import type { EvalTrial } from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import {
  SignOutIcon,
  StackIcon,
  TerminalWindowIcon,
  TimerIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { TrialStatusBadge } from "@/components/evals/eval-status-badge";
import { VoidReason } from "@/components/evals/void-reason";
import { count, seconds } from "@/lib/evals/duration";
import { fileIcon } from "@/lib/evals/file-presentation";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";

/** A share of the row above it, drawn rather than stated: reading 34.5 against
 * 52.6 is arithmetic, and a bar is the same fact without the sum. */
function Share({ of, value }: { readonly of: number; readonly value: number }) {
  const percent = of === 0 ? 0 : Math.min((value / of) * 100, 100);

  return (
    <span
      aria-hidden="true"
      className="block h-0.5 w-6 shrink-0 overflow-hidden rounded-full bg-muted-foreground/20"
    >
      <span
        className="block h-full rounded-full bg-muted-foreground/60"
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}

/* The name alone, with the path on hover. A rail is too narrow for a full
   path, and truncating one leaves a column of identical prefixes with the
   part that differs off the right edge. */
function FileRow({ path }: { readonly path: string }) {
  const Glyph = fileIcon(path);
  const name = path.slice(path.lastIndexOf("/") + 1);

  return (
    <li className="flex min-w-0">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              className="flex min-w-0 cursor-help items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              type="button"
            >
              <Glyph
                aria-hidden="true"
                className="shrink-0 text-muted-foreground"
                size={14}
              />
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {name}
              </span>
            </button>
          }
        />
        <TooltipContent className="max-w-sm" side="left">
          <span className="break-all font-mono text-xs">{path}</span>
        </TooltipContent>
      </Tooltip>
    </li>
  );
}

/**
 * What the trial cost, beside the trajectory that spent it.
 *
 * Grouped by what the numbers are, not listed flat. Time is a hierarchy:
 * agent and sandbox sum to the trial, and thinking and commands break down the
 * agent phase. Eight peer rows made `sandbox 7.6s` and `working 7.6s` look
 * like one measurement printed twice.
 *
 * The breakdown is drawn from the same journal the chart draws, so the rail
 * and the trajectory beside it cannot disagree about what the trial spent. It
 * does not add up to the agent row and is not presented as if it does: the
 * journal records fewer milliseconds than the phase took.
 *
 * Outcome first, then duration, then cost, because a reader arrives asking
 * whether it passed.
 */
export function TrialRail({ trial }: { readonly trial: EvalTrial }) {
  const { thinkingMs, workingMs } = waterfallLayout(trial.trajectory);
  const measured = trial.timed && thinkingMs + workingMs > 0;
  const trialTotalMs = trial.modelMs + trial.sandboxMs;

  return (
    <aside className={RAIL_FRAME}>
      <RailSection title="Trial">
        <div className="flex flex-col gap-2">
          <TrialStatusBadge status={trial.status} />

          <div className="flex flex-col">
            <RailFact
              hint="What the verify script returned. Zero is a pass; anything else is the check saying no."
              Icon={SignOutIcon}
              label="exit"
              value={
                trial.exitCode === -1 ? "undecided" : String(trial.exitCode)
              }
            />
            <RailFact
              hint="Shell commands the agent ran in the sandbox."
              Icon={TerminalWindowIcon}
              label="commands"
              value={String(trial.commands)}
            />
            {trial.failedCommands > 0 ? (
              <RailFact
                hint="Commands that exited non-zero. An agent probing a repository hits these and recovers, so a passed trial can still have them."
                Icon={WarningIcon}
                label="failed"
                tone="warning"
                value={String(trial.failedCommands)}
              />
            ) : null}
          </div>

          <div className="flex flex-col">
            <RailFact
              Icon={TimerIcon}
              label="took"
              value={seconds(trial.modelMs + trial.sandboxMs)}
            />

            <RailFact
              detail={<Share of={trialTotalMs} value={trial.modelMs} />}
              hint="The harness running, start to finish. Contains the thinking and commands below it."
              label="agent"
              tone="muted"
              value={seconds(trial.modelMs)}
            />

            {measured ? (
              <>
                <RailFact
                  detail={<Share of={trialTotalMs} value={thinkingMs} />}
                  hint="Between one recorded event and the next, so harness overhead is inside it as well as the model."
                  label="thinking"
                  tone="muted"
                  value={seconds(thinkingMs)}
                />
                <RailFact
                  detail={<Share of={trialTotalMs} value={workingMs} />}
                  hint="Commands running in the sandbox, measured end to end."
                  label="commands"
                  tone="muted"
                  value={seconds(workingMs)}
                />
              </>
            ) : null}

            <RailFact
              detail={<Share of={trialTotalMs} value={trial.sandboxMs} />}
              hint="Creating and tearing down the sandbox, outside the agent run."
              label="sandbox"
              tone="muted"
              value={seconds(trial.sandboxMs)}
            />
          </div>

          {trial.usage === null ? null : (
            <div className="flex flex-col">
              <RailFact
                hint="Everything the model read and wrote across the trial."
                Icon={StackIcon}
                label="tokens"
                value={count(trial.usage.totalTokens)}
              />
              <RailFact
                label="in"
                tone="muted"
                value={count(trial.usage.inputTokens)}
              />
              <RailFact
                label="out"
                tone="muted"
                value={count(trial.usage.outputTokens)}
              />
            </div>
          )}

          <VoidReason fields={trial.voidFields} />
        </div>
      </RailSection>

      {trial.filesChanged.length === 0 ? null : (
        <RailSection title="Files changed">
          <ul className="flex flex-col gap-1">
            {trial.filesChanged.map((path) => (
              <FileRow key={path} path={path} />
            ))}
          </ul>
        </RailSection>
      )}
    </aside>
  );
}
