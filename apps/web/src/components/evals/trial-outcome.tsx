import type { EvalTrial } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { SignOutIcon, TerminalWindowIcon } from "@phosphor-icons/react";
import { CommandsHint } from "@/components/evals/commands-hint";
import { VoidReason } from "@/components/evals/void-reason";

const commandsValue = (trial: EvalTrial) => {
  if (trial.commands === 0) {
    return `${trial.failedCommands} failed commands`;
  }

  return trial.failedCommands === 0
    ? `${trial.commands} commands`
    : `${trial.commands} commands, ${trial.failedCommands} failed`;
};

export function TrialOutcome({ trial }: { readonly trial: EvalTrial }) {
  const exited = trial.exitCode !== -1;
  const ranCommands = trial.commands + trial.failedCommands > 0;

  if (!(exited || ranCommands || trial.voidFields.length > 0)) {
    return null;
  }

  return (
    <RailSection title="Outcome">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          {exited ? (
            <RailFact
              hint="What the verify script returned. Zero is a pass; anything else is the check saying no."
              Icon={SignOutIcon}
              label="exit code"
              value={`exit ${trial.exitCode}`}
            />
          ) : null}
          {ranCommands ? (
            <RailFact
              hint={<CommandsHint trial={trial} />}
              Icon={TerminalWindowIcon}
              label="commands"
              value={commandsValue(trial)}
            />
          ) : null}
        </div>

        <VoidReason fields={trial.voidFields} />
      </div>
    </RailSection>
  );
}
