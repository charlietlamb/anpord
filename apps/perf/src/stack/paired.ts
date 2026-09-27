import { bootStack, type Stack, type StackOptions } from "./stack";

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
    await teardownAll(stacks);
    throw cause;
  }
};

export const teardownAll = async (stacks: readonly Stack[]) => {
  for (const stack of stacks) {
    await stack.teardown();
  }
};

export const alternating = <T>(items: readonly T[], round: number) =>
  round % 2 === 0 ? items : [...items].reverse();
