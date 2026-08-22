import type { EvalTrial } from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { ShareBar } from "@anpord/ui/components/ui/share-bar";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import {
  BrainIcon,
  CubeIcon,
  SignOutIcon,
  TerminalWindowIcon,
  TimerIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { TrialStatusBadge } from "@/components/evals/eval-status-badge";
import { TrialCost } from "@/components/evals/trial-cost";
import { VoidReason } from "@/components/evals/void-reason";
import { seconds } from "@/lib/evals/duration";
import { fileIcon } from "@/lib/evals/file-presentation";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";

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
      <RailSection title="Outcome">
        <div className="flex flex-col gap-2">
          <TrialStatusBadge status={trial.status} />

          <div className="flex flex-col">
            <RailFact
              hint="What the verify script returned. Zero is a pass; anything else is the check saying no."
              Icon={SignOutIcon}
              label="exit code"
              layout="stated"
              value={
                trial.exitCode === -1
                  ? "undecided exit"
                  : `exit ${trial.exitCode}`
              }
            />
            <RailFact
              hint="Shell commands the agent ran in the sandbox."
              Icon={TerminalWindowIcon}
              label="commands"
              layout="stated"
              value={`${trial.commands} commands`}
            />
            {trial.failedCommands > 0 ? (
              <RailFact
                hint="Commands that exited non-zero. An agent probing a repository hits these and recovers, so a passed trial can still have them."
                Icon={WarningIcon}
                label="failed"
                layout="stated"
                tone="warning"
                value={`${trial.failedCommands} failed`}
              />
            ) : null}
          </div>

          <VoidReason fields={trial.voidFields} />
        </div>
      </RailSection>

      <RailSection title="Time">
        <div className="flex flex-col">
          <RailFact
            hint="The agent run plus the sandbox around it."
            Icon={TimerIcon}
            label="duration"
            layout="stated"
            value={`took ${seconds(trialTotalMs)}`}
          />

          {measured ? (
            <RailFact
              detail={<ShareBar of={trialTotalMs} value={thinkingMs} />}
              hint="Between one recorded event and the next, so harness overhead is inside it as well as the model. The rest of the agent phase is the journal's own gaps."
              Icon={BrainIcon}
              label="thinking"
              layout="stated"
              value={`${seconds(thinkingMs)} thinking`}
            />
          ) : null}

          {measured ? (
            <RailFact
              detail={<ShareBar of={trialTotalMs} value={workingMs} />}
              hint="Commands running in the sandbox, measured end to end."
              Icon={TerminalWindowIcon}
              label="running commands"
              layout="stated"
              value={`${seconds(workingMs)} running`}
            />
          ) : null}

          <RailFact
            detail={<ShareBar of={trialTotalMs} value={trial.sandboxMs} />}
            hint="Creating and tearing down the sandbox, outside the agent run."
            Icon={CubeIcon}
            label="sandbox"
            layout="stated"
            value={`${seconds(trial.sandboxMs)} sandbox`}
          />
        </div>
      </RailSection>

      {trial.usage === null ? null : (
        <RailSection title="Cost">
          <TrialCost usage={trial.usage} />
        </RailSection>
      )}

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
