import { Effect, type Either } from "effect";

/* Collected, not failed fast: one refused cell must not abandon the run. */
export const forEachGridCell = <Subject, Task, A, E, R>(
  cases: readonly Subject[],
  tasks: readonly Task[],
  evaluate: (
    subject: Subject,
    task: Task,
    caseIndex: number,
    taskIndex: number
  ) => Effect.Effect<A, E, R>
): Effect.Effect<readonly Either.Either<A, E>[], never, R> =>
  Effect.forEach(
    tasks.flatMap((task, taskIndex) =>
      cases.map(
        (subject, caseIndex) => [subject, task, caseIndex, taskIndex] as const
      )
    ),
    ([subject, task, caseIndex, taskIndex]) =>
      Effect.either(evaluate(subject, task, caseIndex, taskIndex)),
    { concurrency: "unbounded" }
  );
