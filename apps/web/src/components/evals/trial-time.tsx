import type { EvalTrial } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { ShareBar } from "@anpord/ui/components/ui/share-bar";
import {
  BrainIcon,
  CubeIcon,
  TerminalWindowIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { seconds } from "@/lib/evals/duration";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";

export function TrialTime({ trial }: { readonly trial: EvalTrial }) {
  const { thinkingMs, workingMs } = waterfallLayout(trial.trajectory);
  const measured = trial.timed && thinkingMs + workingMs > 0;
  const trialTotalMs =
    trial.modelMs +
    trial.sandboxMs +
    (trial.judgments ?? []).reduce(
      (total, judgment) => total + judgment.durationMs,
      0
    );

  if (!(trialTotalMs > 0 || measured)) {
    return null;
  }

  return (
    <RailSection title="Time">
      <div className="flex flex-col">
        {trialTotalMs === 0 ? null : (
          <RailFact
            hint="The agent, its sandbox, and any model judges."
            Icon={TimerIcon}
            label="duration"
            layout="stated"
            value={`took ${seconds(trialTotalMs)}`}
          />
        )}

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

        {trial.sandboxMs === 0 ? null : (
          <RailFact
            detail={<ShareBar of={trialTotalMs} value={trial.sandboxMs} />}
            hint="Creating and tearing down the sandbox, outside the agent run."
            Icon={CubeIcon}
            label="sandbox"
            layout="stated"
            value={`${seconds(trial.sandboxMs)} sandbox`}
          />
        )}
      </div>
    </RailSection>
  );
}
