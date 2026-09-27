import { bootStack, type Stack, type StackOptions } from "./stack";

export const teardownAll = async (
  stacks: readonly Pick<Stack, "teardown">[]
) => {
  const failures: unknown[] = [];
  for (const stack of stacks) {
    try {
      await stack.teardown();
    } catch (cause) {
      failures.push(cause);
    }
  }
  if (failures.length === 1) {
    throw failures[0];
  }
  if (failures.length > 1) {
    throw new AggregateError(failures, "Several stacks failed to tear down.");
  }
};

export const bootStacks = async (
  targets: readonly string[],
  options: Omit<StackOptions, "repositoryRoot">
): Promise<readonly Stack[]> => {
  const stacks: Stack[] = [];
  try {
    for (const target of targets) {
      stacks.push(await bootStack({ ...options, repositoryRoot: target }));
    }
    return stacks;
  } catch (cause) {
    try {
      await teardownAll(stacks);
    } catch (teardown) {
      throw new AggregateError(
        [cause, teardown],
        "A stack failed to boot, and tearing down the booted ones failed too."
      );
    }
    throw cause;
  }
};

export const alternating = <T>(items: readonly T[], round: number) =>
  round % 2 === 0 ? items : [...items].reverse();
