import { DEFAULT_SANDBOX } from "@anpord/schema/domain/evals";
import type { HarnessProfile } from "@anpord/schema/domain/harness-profile";

export interface KeyedTask {
  readonly harness: string;
  readonly model: string;
  readonly profile?: HarnessProfile | undefined;
  readonly sandbox?: string | undefined;
}

/* Keyed on the resolved sandbox, so two tasks that both omit one are the same
   column; and on the profile's name, not its content: one run cannot hold the
   same column twice. */
export const tasksAreDistinct = (tasks: readonly KeyedTask[]) => {
  const keys = tasks.map((task) =>
    [
      task.harness,
      task.model,
      task.sandbox ?? DEFAULT_SANDBOX,
      task.profile?.name ?? "",
    ].join("\0")
  );

  return new Set(keys).size === keys.length;
};
