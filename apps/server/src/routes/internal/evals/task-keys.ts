import type { HarnessProfile } from "@anpord/schema/domain/harness-profile";

interface KeyedTask {
  readonly harness: string;
  readonly model: string;
  readonly profile?: HarnessProfile | undefined;
  readonly provider: string;
}

/**
 * Whether every task in a start names a distinct column.
 *
 * The profile's name joins the key rather than its content: two profiles of
 * one name on one base are the same column read twice, which is what a run
 * compares across runs, and one run cannot hold both.
 */
export const tasksAreDistinct = (tasks: readonly KeyedTask[]) => {
  const keys = tasks.map((task) =>
    [task.harness, task.model, task.provider, task.profile?.name ?? ""].join(
      "\0"
    )
  );

  return new Set(keys).size === keys.length;
};
