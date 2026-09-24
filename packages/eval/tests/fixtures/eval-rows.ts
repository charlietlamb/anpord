import type { Database } from "@anpord/db/client";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";

export const caseFixture = {
  table: evalCase,
  values: (input: {
    readonly id: string;
    readonly internalId: string;
    readonly organizationId: string;
  }) => ({
    id: `case-${input.id}`,
    internalId: `ecas_${input.internalId}`,
    name: "fixture",
    organizationId: input.organizationId,
  }),
};

/** The task row every persistence test needs, in one place rather than
 * repeated in each file with its own spelling of the same columns. */
export const taskFixture = {
  table: evalCaseVersion,
  values: (input: {
    readonly id: string;
    readonly internalId: string;
    readonly organizationId: string;
  }) => ({
    caseInternalId: `ecas_${input.internalId}`,
    definitionHash: input.id,
    internalId: input.internalId,
    name: "fixture",
    organizationId: input.organizationId,
    prompt: "fix the failing test",
    verifyCommand: "node --test 2>&1",
    workspace: "/tmp/anpord-task",
  }),
};

export const seedCaseVersion = async (
  db: Database["Type"],
  input: {
    readonly id: string;
    readonly internalId: string;
    readonly organizationId: string;
  }
) => {
  await db
    .insert(evalCase)
    .values(caseFixture.values(input))
    .onConflictDoNothing();
  await db
    .insert(evalCaseVersion)
    .values(taskFixture.values(input))
    .onConflictDoNothing();
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
