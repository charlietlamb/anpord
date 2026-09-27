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

const failAfterTeardown = async (
  cause: unknown,
  teardown: () => Promise<void>,
  message: string
): Promise<never> => {
  try {
    await teardown();
  } catch (teardownFailure) {
    throw new AggregateError([cause, teardownFailure], message);
  }
  throw cause;
};

export const runThenTeardown = async <T>(
  use: () => Promise<T>,
  teardown: () => Promise<void>
): Promise<T> => {
  let result: T;
  try {
    result = await use();
  } catch (cause) {
    return failAfterTeardown(
      cause,
      teardown,
      "Using the stacks failed, and tearing them down failed too."
    );
  }
  await teardown();
  return result;
};

export const withStacks = async <T>(
  targets: readonly string[],
  options: StackOptions,
  use: (stacks: readonly Stack[]) => Promise<T>
): Promise<T> => {
  const stacks: Stack[] = [];
  const teardown = () => teardownAll(stacks);
  try {
    for (const target of targets) {
      stacks.push(await bootStack(target, options));
    }
  } catch (cause) {
    return failAfterTeardown(
      cause,
      teardown,
      "A stack failed to boot, and tearing down the booted ones failed too."
    );
  }
  return runThenTeardown(() => use(stacks), teardown);
};

export const alternating = <T>(items: readonly T[], round: number) =>
  round % 2 === 0 ? items : [...items].reverse();

export const inRounds = async <T>(
  rounds: number,
  items: readonly T[],
  run: (item: T, round: number) => Promise<void>
) => {
  for (let round = 0; round < rounds; round += 1) {
    for (const item of alternating(items, round)) {
      await run(item, round);
    }
  }
};
