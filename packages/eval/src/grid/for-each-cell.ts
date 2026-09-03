import { Effect, type Either } from "effect";

/**
 * Every cell of the grid, each ending on its own.
 *
 * Collected rather than failed fast: one cell that could not run used to
 * interrupt the rest and abandon the run before anything closed it, so the
 * row said `running` forever over cells that had long since settled. The
 * caller reads the failures off the result and closes the run accordingly.
 */
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
