import type { CredentialIntegration } from "@anpord/schema/domain/credentials";
import type { Icon } from "@phosphor-icons/react";
import { BrainIcon, CubeIcon, RobotIcon } from "@phosphor-icons/react";

export interface ConnectionSectionSpec {
  readonly addLabel: string;
  readonly category: CredentialIntegration["category"];
  readonly empty: string;
  readonly emptyTitle: string;
  readonly Icon: Icon;
  readonly note: string;
  readonly title: string;
}

export const CONNECTION_SECTIONS: readonly ConnectionSectionSpec[] = [
  {
    addLabel: "Add harness",
    category: "harness",
    empty: "Connect one and your evals can run.",
    emptyTitle: "No harnesses connected",
    Icon: RobotIcon,
    note: "Required. The agent runs on your account, and the model usage is charged there.",
    title: "Harnesses",
  },
  {
    addLabel: "Add provider",
    category: "model",
    empty:
      "Connect one to score cases, or to play the human in a conversation.",
    emptyTitle: "No models connected",
    Icon: BrainIcon,
    note: "Optional. Needed to score a case with a model, and for a case that states a human.",
    title: "Models",
  },
  {
    addLabel: "Add sandbox",
    category: "sandbox",
    empty: "Runs use Anpord's account until you connect your own.",
    emptyTitle: "No sandboxes connected",
    Icon: CubeIcon,
    note: "Optional. Runs use Anpord's account unless you connect your own.",
    title: "Sandboxes",
  },
];
