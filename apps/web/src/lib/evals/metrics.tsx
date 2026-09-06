import {
  BrainIcon,
  CheckCircleIcon,
  CubeIcon,
  type Icon,
  SignOutIcon,
  StackIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";

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
