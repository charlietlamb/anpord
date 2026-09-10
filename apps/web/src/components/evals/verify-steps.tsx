import {
  readingOf,
  type StepReading,
  stepsOf,
} from "@anpord/schema/domain/verify-steps";
import type { StepVerdict } from "@anpord/schema/domain/verify-verdicts";
import { InlineCode } from "@anpord/ui/components/ui/inline-code";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { cn } from "@anpord/ui/lib/utils";
import { CheckIcon, XIcon } from "@phosphor-icons/react";

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

export function VerifySteps({
  command,
  script,
  verdicts,
}: {
  readonly command: string;
  /* The shell itself rather than what it checks. */
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
