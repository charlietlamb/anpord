import { CheckFailed } from "./expect";

export interface Scenario<Context> {
  readonly name: string;
  readonly run: (context: Context) => Promise<void>;
}

export interface Outcome {
  readonly millis: number;
  readonly name: string;
  readonly passed: boolean;
  readonly reason?: string;
}

const PASS = "pass";
const FAIL = "fail";

/* A failed check already reads as a sentence; anything else is a surprise, where the stack is the useful part. */
const reason = (cause: unknown) => {
  if (cause instanceof CheckFailed) {
    return cause.message;
  }
  if (cause instanceof Error) {
    return cause.stack ?? cause.message;
  }
  return String(cause);
};

/* Every scenario runs even after a failure, so one run reports the whole surface. */
export const runScenarios = async <Context>(
  scenarios: readonly Scenario<Context>[],
  context: Context
): Promise<readonly Outcome[]> => {
  const outcomes: Outcome[] = [];

  for (const scenario of scenarios) {
    const started = performance.now();

    try {
      await scenario.run(context);
      const millis = Math.round(performance.now() - started);
      outcomes.push({ millis, name: scenario.name, passed: true });
      process.stdout.write(`  ${PASS}  ${scenario.name} (${millis}ms)\n`);
    } catch (cause) {
      const millis = Math.round(performance.now() - started);
      outcomes.push({
        millis,
        name: scenario.name,
        passed: false,
        reason: reason(cause),
      });
      process.stdout.write(`  ${FAIL}  ${scenario.name} (${millis}ms)\n`);
      process.stdout.write(
        `        ${reason(cause).split("\n").join("\n        ")}\n`
      );
    }
  }

  return outcomes;
};
