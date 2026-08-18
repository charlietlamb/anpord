export class CheckFailed extends Error {
  constructor(check: string, detail: string) {
    super(`${check}: ${detail}`);
    this.name = "CheckFailed";
  }
}

const show = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value);

export const equals = <A>(check: string, actual: A, expected: A) => {
  if (!Object.is(actual, expected)) {
    throw new CheckFailed(
      check,
      `expected ${show(expected)}, got ${show(actual)}`
    );
  }
};

export const isTrue = (check: string, actual: boolean, detail: string) => {
  if (!actual) {
    throw new CheckFailed(check, detail);
  }
};

export const contains = (check: string, haystack: string, needle: string) => {
  if (!haystack.includes(needle)) {
    throw new CheckFailed(
      check,
      `expected to find ${show(needle)} in ${show(haystack)}`
    );
  }
};

/** Asserts the call fails, and hands back the reason so a scenario can check
 * the failure it actually wanted rather than any failure at all. */
export const rejects = async (check: string, run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (cause) {
    return cause;
  }

  throw new CheckFailed(check, "expected the call to fail, but it succeeded");
};
