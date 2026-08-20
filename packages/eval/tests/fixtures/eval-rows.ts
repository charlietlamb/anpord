import { evalTask } from "@anpord/db/schema/evals/eval-tasks";

/** The task row every persistence test needs, in one place rather than
 * repeated in each file with its own spelling of the same columns. */
export const taskFixture = {
  table: evalTask,
  values: (input: {
    readonly id: string;
    readonly internalId: string;
    readonly organizationId: string;
  }) => ({
    id: input.id,
    internalId: input.internalId,
    name: "fixture",
    organizationId: input.organizationId,
    prompt: "fix the failing test",
    verifyCommand: "node --test 2>&1",
    workspace: "/tmp/anpord-task",
  }),
};

/** A trial's status from what happened to it. Void wins over the verdict,
 * because a trial that never ran has no verdict to report. */
export const statusOf = (input: {
  readonly passed: boolean;
  readonly voided: boolean;
}) => {
  if (input.voided) {
    return "void" as const;
  }

  return input.passed ? ("passed" as const) : ("failed" as const);
};
