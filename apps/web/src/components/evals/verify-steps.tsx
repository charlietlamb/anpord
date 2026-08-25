import {
  readingOf,
  type StepReading,
  stepsOf,
} from "@anpord/schema/domain/verify-steps";
import type { StepVerdict } from "@anpord/schema/domain/verify-verdicts";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { cn } from "@anpord/ui/lib/utils";
import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { InlineCode } from "@/components/evals/inline-code";

function Reading({
  reading,
  step,
}: {
  readonly reading: StepReading;
  readonly step: string;
}) {
  if (reading.kind === "command") {
    return (
      <span className="line-clamp-2" title={step}>
        <InlineCode className="text-foreground/85">{reading.text}</InlineCode>
      </span>
    );
  }

  if (reading.kind === "message") {
    return (
      <span className="text-foreground" title={step}>
        <span className="mr-1.5 text-muted-foreground/70">throws</span>
        {reading.text}
      </span>
    );
  }

  return (
    <span className="text-foreground" title={step}>
      {reading.text}
    </span>
  );
}

/**
 * The mark on the rail: a tick, a cross, or a dot for a step nobody measured.
 *
 * The tick and cross sit in a tinted disc rather than bare, so at ten pixels
 * they read as marks and not as stray glyphs; the dot stays a dot, because a
 * step with no verdict should not look like it has one.
 */
function Mark({ verdict }: { readonly verdict: StepVerdict }) {
  if (verdict === "passed") {
    return (
      <span className="relative z-10 mt-[3px] flex size-[15px] shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckIcon aria-hidden="true" size={9} weight="bold" />
        <span className="sr-only">passed</span>
      </span>
    );
  }

  if (verdict === "failed") {
    return (
      <span className="relative z-10 mt-[3px] flex size-[15px] shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <XIcon aria-hidden="true" size={9} weight="bold" />
        <span className="sr-only">failed</span>
      </span>
    );
  }

  return (
    <span className="relative z-10 flex size-[15px] shrink-0 items-center justify-center">
      <span
        aria-hidden="true"
        className={cn(
          "size-[7px] rounded-full",
          verdict === "unreached"
            ? "bg-muted-foreground/25"
            : "bg-muted-foreground/50"
        )}
      />
      <span className="sr-only">
        {verdict === "unreached" ? "not reached" : "not recorded"}
      </span>
    </span>
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
 * So the conditions are drawn as steps on one line, because that is what `&&`
 * is: each runs only if the one above it held, and the first to fail ends the
 * walk. Each is set as what it is. A condition is a sentence. A message is
 * what the step throws, and is marked so, because "too many tabs" beside
 * "docs.json exists" would otherwise read as two checks phrased two ways
 * rather than a check and a failure. A command is code, whole, and wraps.
 *
 * The marks come from the trail the scorer leaves as it runs the steps. Where
 * there is no trail the rail carries dots, and past a failure the line fades:
 * the steps below it were never run, and a tick there would be a claim.
 */
export function VerifySteps({
  command,
  script,
  verdicts,
}: {
  readonly command: string;
  /** The shell itself rather than what it checks. */
  readonly script: boolean;
  readonly verdicts: readonly StepVerdict[];
}) {
  const steps = stepsOf(command);

  if (script || steps.length < 2) {
    return (
      <ShellBlock
        className="-mx-1 max-h-96"
        command={command}
        copyable={false}
        tone="plain"
      />
    );
  }

  return (
    <ol className="flex min-w-0 flex-col">
      {steps.map((step, index) => {
        const verdict = verdicts[index] ?? "unknown";
        const last = index === steps.length - 1;
        const fading = last || verdict === "failed";

        return (
          <li className="relative flex min-w-0 items-start gap-3" key={step}>
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-[18px] bottom-0 left-[7px] w-px",
                fading
                  ? "bg-gradient-to-b from-border-faint to-transparent"
                  : "bg-border-faint"
              )}
            />
            <Mark verdict={verdict} />
            <span
              className={cn(
                "min-w-0 flex-1 pb-2.5 text-xs leading-5",
                last && "pb-0",
                verdict === "unreached" && "text-muted-foreground"
              )}
            >
              <Reading reading={readingOf(step)} step={step} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
