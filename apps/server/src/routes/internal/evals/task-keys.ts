import type { HarnessProfile } from "@anpord/schema/domain/harness-profile";

export interface KeyedTask {
  readonly harness: string;
  readonly model: string;
  readonly profile?: HarnessProfile | undefined;
  readonly provider: string;
}

/* Keyed on the profile's name, not its content: one run cannot hold the same column twice. */
export const tasksAreDistinct = (tasks: readonly KeyedTask[]) => {
  const keys = tasks.map((task) =>
    [task.harness, task.model, task.provider, task.profile?.name ?? ""].join(
      "\0"
    )
  );

  return new Set(keys).size === keys.length;
};
