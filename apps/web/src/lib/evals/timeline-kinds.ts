import {
  BookOpenIcon,
  ChatCircleDotsIcon,
  FilePlusIcon,
  type Icon,
  MagnifyingGlassIcon,
  TerminalWindowIcon,
  UserIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { StepVerb } from "@/lib/evals/step-title";
import type { MomentKind, TimelineStep } from "@/lib/evals/timeline-sections";

interface VerbLook {
  readonly colour: string;
  readonly icon: Icon;
  readonly label: string;
}

export const VERBS: Record<StepVerb, VerbLook> = {
  agent: {
    colour: "var(--trace-message)",
    icon: ChatCircleDotsIcon,
    label: "Said",
  },
  called: { colour: "var(--trace-tool)", icon: WrenchIcon, label: "Called" },
  ran: {
    colour: "var(--trace-command)",
    icon: TerminalWindowIcon,
    label: "Ran",
  },
  read: {
    colour: "var(--muted-foreground)",
    icon: BookOpenIcon,
    label: "Read",
  },
  searched: {
    colour: "var(--muted-foreground)",
    icon: MagnifyingGlassIcon,
    label: "Searched",
  },
  wrote: { colour: "var(--trace-file)", icon: FilePlusIcon, label: "Wrote" },
  you: { colour: "var(--trace-said)", icon: UserIcon, label: "You" },
};

const COUNTED: readonly StepVerb[] = [
  "read",
  "searched",
  "ran",
  "called",
  "wrote",
];

export const MOMENT_ORDER: readonly MomentKind[] = [
  "replied",
  "wrote",
  "failed",
];

const FAILED_COLOUR = "var(--destructive)";

export const MOMENTS: Record<MomentKind, { colour: string; label: string }> = {
  failed: { colour: FAILED_COLOUR, label: "Failed" },
  replied: { colour: "var(--trace-said)", label: "Asked you" },
  wrote: { colour: "var(--trace-file)", label: "Wrote files" },
};

export const verbColour = (verb: StepVerb, failed: boolean) =>
  failed ? FAILED_COLOUR : VERBS[verb].colour;

export const countVerbs = (steps: readonly TimelineStep[]) =>
  COUNTED.flatMap((verb) => {
    const matching = steps.filter((step) => step.title.verb === verb);
    return matching.length === 0
      ? []
      : [
          {
            count: matching.length,
            failed: matching.some((step) => step.failed),
            verb,
          },
        ];
  });
