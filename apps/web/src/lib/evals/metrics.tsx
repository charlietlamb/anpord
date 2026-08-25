import {
  BrainIcon,
  CheckCircleIcon,
  CubeIcon,
  type Icon,
  SignOutIcon,
  StackIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";

/**
 * The figures this app reports about a trial, a cell or a variant, and the
 * glyph and words each is known by.
 *
 * One registry because a run, a cell and a trial each show the same numbers
 * at a different depth, and a reader who learns that the brain means model
 * time on one screen should find it meaning that on the next.
 */
export interface MetricPresentation {
  readonly hint: string;
  readonly Icon: Icon;
  readonly label: string;
}

export const METRICS = {
  commands: {
    hint: "Commands the agent ran",
    Icon: TerminalWindowIcon,
    label: "Commands",
  },
  exit: {
    hint: "Exit code of the verify script",
    Icon: SignOutIcon,
    label: "Exit",
  },
  model: {
    hint: "Time the model spent thinking",
    Icon: BrainIcon,
    label: "Model",
  },
  pass: {
    hint: "Trials that passed",
    Icon: CheckCircleIcon,
    label: "Pass",
  },
  sandbox: {
    hint: "Time spent in the sandbox",
    Icon: CubeIcon,
    label: "Sandbox",
  },
  tokens: {
    hint: "Tokens the harness reported",
    Icon: StackIcon,
    label: "Tokens",
  },
} as const satisfies Record<string, MetricPresentation>;

export type MetricName = keyof typeof METRICS;
