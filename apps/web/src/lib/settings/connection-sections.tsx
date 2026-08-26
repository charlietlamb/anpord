import type { CredentialIntegration } from "@anpord/schema/domain/credentials";
import type { Icon } from "@phosphor-icons/react";
import { CubeIcon, RobotIcon } from "@phosphor-icons/react";

export interface ConnectionSectionSpec {
  readonly addLabel: string;
  readonly category: CredentialIntegration["category"];
  readonly empty: string;
  readonly Icon: Icon;
  readonly note: string;
  readonly title: string;
}

/**
 * The two kinds of connection, and the difference that matters.
 *
 * A harness is required because the model usage is charged to the account
 * behind it; a sandbox is not, because a run without one uses Anpord's. The
 * page said neither, so the only way to learn it was to find the run button
 * disabled -- or, for a sandbox, to be told it was missing when it was not.
 */
export const CONNECTION_SECTIONS: readonly ConnectionSectionSpec[] = [
  {
    addLabel: "Add harness",
    category: "harness",
    empty: "Connect one and your evals can run.",
    Icon: RobotIcon,
    note: "Required. The agent runs on your account, and the model usage is charged there.",
    title: "Harnesses",
  },
  {
    addLabel: "Add sandbox",
    category: "sandbox",
    empty: "Runs use Anpord's account until you connect your own.",
    Icon: CubeIcon,
    note: "Optional. Runs use Anpord's account unless you connect your own.",
    title: "Sandboxes",
  },
];
