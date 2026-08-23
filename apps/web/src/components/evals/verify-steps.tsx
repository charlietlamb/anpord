import { stepsOf, summaryOf } from "@anpord/schema/domain/verify-steps";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { cn } from "@anpord/ui/lib/utils";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";

/**
 * One condition the trial was gated on.
 *
 * Closed it says what is checked, which is the question a reader arrives with.
 * The script that checks it is a paragraph of shell and opens only when asked
 * for.
 */
function Step({ step }: { readonly step: string }) {
  const [open, setOpen] = useState(false);
  const summary = summaryOf(step);

  /* Nothing to open when the summary is the command: a disclosure that reveals
     what it was already showing is a control that does nothing. */
  if (summary === step) {
    return (
      <li className="py-1 font-mono text-foreground text-xs leading-relaxed">
        {step}
      </li>
    );
  }

  return (
    <li>
      <button
        aria-expanded={open}
        className="flex w-full items-start gap-1.5 rounded-sm py-1 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <CaretRightIcon
          className={cn(
            "mt-0.5 size-3 shrink-0 text-muted-foreground transition-transform duration-150 ease-out",
            open ? "rotate-90" : null
          )}
          weight="bold"
        />
        <span className="min-w-0 flex-1 text-foreground text-xs leading-relaxed">
          {summary}
        </span>
      </button>

      {open ? (
        <ShellBlock
          className="mb-1 ml-4.5 max-h-60"
          command={step}
          copyable={false}
        />
      ) : null}
    </li>
  );
}

/**
 * What decided whether the trial passed.
 *
 * A verifier is usually one command and is shown as one. A verifier that gates
 * on many conditions is written as those conditions joined by `&&`, and the
 * longest here is 2891 characters holding fifteen: as a single block that is a
 * wall, and a reader cannot tell what is being asked of the agent without
 * reading shell.
 *
 * No step is marked passed or failed. The shell runs the line as one command
 * and reports one exit code, and `&&` stops at the first failure, so which
 * step failed is not something we know -- and a tick beside a step nobody
 * measured would read as an answer.
 */
export function VerifySteps({ command }: { readonly command: string }) {
  const steps = stepsOf(command);

  if (steps.length < 2) {
    return <ShellBlock className="max-h-80" command={command} />;
  }

  return (
    <ol className="flex min-w-0 flex-col divide-y divide-border-faint">
      {steps.map((step) => (
        <Step key={step} step={step} />
      ))}
    </ol>
  );
}
