import type { EvalSetup, EvalTrial } from "@anpord/schema/domain/evals";
import { stepsOf } from "@anpord/schema/domain/verify-steps";
import {
  type StepVerdict,
  verdictsOf,
} from "@anpord/schema/domain/verify-verdicts";
import { CopyButton } from "@anpord/ui/components/copy-button";
import {
  CheckSquareIcon,
  FolderOpenIcon,
  GitBranchIcon,
  type Icon,
  TerminalWindowIcon,
  TextAlignLeftIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { TickedProse } from "@/components/evals/inline-code";
import { SetupSurface } from "@/components/evals/setup-surface";
import { VerifySteps } from "@/components/evals/verify-steps";

const lines = (value: string) => {
  const count = value.trimEnd().split("\n").length;

  return `${count} line${count === 1 ? "" : "s"}`;
};

const checks = (verdicts: readonly StepVerdict[]) => {
  const total = verdicts.length;
  const judged = verdicts.filter((verdict) => verdict !== "unknown").length;

  if (judged === 0) {
    return `${total} check${total === 1 ? "" : "s"}`;
  }

  const passed = verdicts.filter((verdict) => verdict === "passed").length;

  return `${passed}/${total} passed`;
};

function Pill({
  Icon: Glyph,
  label,
  value,
}: {
  readonly Icon: Icon;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-muted/50 px-2 py-0.5 text-xs">
      <Glyph
        aria-hidden="true"
        className="shrink-0 text-muted-foreground"
        size={12}
      />
      <span className="text-muted-foreground/70">{label}</span>
      <span className="break-all font-mono text-foreground/85">{value}</span>
    </span>
  );
}

function Where({ setup }: { readonly setup: EvalSetup }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Pill Icon={FolderOpenIcon} label="workspace" value={setup.workspace} />

      {setup.repoUrl === null ? null : (
        <Pill
          Icon={GitBranchIcon}
          label="repo"
          value={`${setup.repoUrl}${setup.repoRef === null ? "" : `@${setup.repoRef}`}`}
        />
      )}
    </div>
  );
}

const CONTROL =
  "h-6 rounded-md px-1.5 text-muted-foreground text-xs transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground";

function Verify({
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
      Icon={CheckSquareIcon}
      meta={checks(verdicts)}
      title="Verify"
    >
      <VerifySteps command={command} script={script} verdicts={verdicts} />
    </SetupSurface>
  );
}

function Validation({
  setup,
  trials,
}: {
  readonly setup: EvalSetup;
  readonly trials: readonly EvalTrial[];
}) {
  if (setup.validatorName !== null) {
    return (
      <p className="flex h-7 items-center gap-1.5 text-muted-foreground text-xs">
        <CheckSquareIcon aria-hidden="true" className="shrink-0" size={13} />
        Validated by <code>{setup.validatorName}</code>
      </p>
    );
  }

  if (setup.verifyCommand !== null) {
    return <Verify command={setup.verifyCommand} trials={trials} />;
  }

  return (
    <p className="flex h-7 items-center gap-1.5 text-muted-foreground text-xs">
      <CheckSquareIcon aria-hidden="true" className="shrink-0" size={13} />
      No verifier, so trials are void rather than passed.
    </p>
  );
}

export function CellSetup({
  setup,
  trials,
}: {
  readonly setup: EvalSetup;
  readonly trials: readonly EvalTrial[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <Where setup={setup} />

      <SetupSurface
        controls={
          <CopyButton label="Copy prompt" size="inline" value={setup.prompt} />
        }
        Icon={TextAlignLeftIcon}
        meta={lines(setup.prompt)}
        title="Prompt"
      >
        <p className="max-w-prose whitespace-pre-wrap text-pretty text-foreground/80 text-xs leading-relaxed">
          <TickedProse text={setup.prompt} />
        </p>
      </SetupSurface>

      {setup.prepareName === null ? null : (
        <p className="flex h-7 items-center gap-1.5 text-muted-foreground text-xs">
          <TerminalWindowIcon
            aria-hidden="true"
            className="shrink-0"
            size={13}
          />
          Prepared by <code>{setup.prepareName}</code>
        </p>
      )}

      <Validation setup={setup} trials={trials} />
    </div>
  );
}
