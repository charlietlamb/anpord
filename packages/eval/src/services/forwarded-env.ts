/* Names, never a whole environment: a sandbox that inherited the machine's
   variables would carry every key on it into a model's context and into the
   journal the run writes down. What an eval needs, it says. */
export const forwardedEnv = (
  names: readonly string[],
  source: Readonly<Record<string, string | undefined>>
): Readonly<Record<string, string>> =>
  Object.fromEntries(
    names.flatMap((name) => {
      const value = source[name];

      return value === undefined ? [] : [[name, value] as const];
    })
  );
