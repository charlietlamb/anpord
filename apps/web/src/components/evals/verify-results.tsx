import type { EvalTrial } from "@anpord/schema/domain/evals";
import { stepsOf } from "@anpord/schema/domain/verify-steps";
import {
  type StepVerdict,
  verdictsOf,
} from "@anpord/schema/domain/verify-verdicts";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { useState } from "react";
import { SetupSurface } from "@/components/evals/setup-surface";
import { VerifySteps } from "@/components/evals/verify-steps";

const checks = (verdicts: readonly StepVerdict[]) => {
  const total = verdicts.length;
  const judged = verdicts.filter((verdict) => verdict !== "unknown").length;

  if (judged === 0) {
    return `${total} check${total === 1 ? "" : "s"}`;
  }

  const passed = verdicts.filter((verdict) => verdict === "passed").length;

  return `${passed}/${total} passed`;
};

const CONTROL =
  "h-6 rounded-md px-1.5 text-muted-foreground text-xs transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground";

export function VerifyResults({
  command,
  trials,
}: {
  readonly command: string;
  readonly trials: readonly EvalTrial[];
}) {
  const [script, setScript] = useState(false);
  const steps = stepsOf(command);
  const verdicts = verdictsOf(steps, trials);
  const many = steps.length > 1;

  return (
    <SetupSurface
      controls={
        <>
          {many ? (
            <button
              aria-pressed={script}
              className={CONTROL}
              onClick={() => setScript((was) => !was)}
              type="button"
            >
              {script ? "checks" : "script"}
            </button>
          ) : null}
          <CopyButton
            label="Copy verify script"
            size="inline"
            value={command}
          />
        </>
      }
      meta={checks(verdicts)}
      title="Verify"
    >
      <VerifySteps command={command} script={script} verdicts={verdicts} />
    </SetupSurface>
  );
}
