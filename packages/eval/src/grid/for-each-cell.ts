import { Effect } from "effect";

export const forEachGridCell = <Subject, Task, A, E, R>(
  cases: readonly Subject[],
  tasks: readonly Task[],
  evaluate: (
    subject: Subject,
    task: Task,
    caseIndex: number,
    taskIndex: number
  ) => Effect.Effect<A, E, R>
) =>
  Effect.forEach(
    tasks.flatMap((task, taskIndex) =>
      cases.map(
        (subject, caseIndex) => [subject, task, caseIndex, taskIndex] as const
      )
    ),
    ([subject, task, caseIndex, taskIndex]) =>
      evaluate(subject, task, caseIndex, taskIndex),
    { concurrency: "unbounded", discard: true }
  );
