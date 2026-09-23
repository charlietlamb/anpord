import { Effect, type Either } from "effect";

/* Each cell opens a sandbox per trial, so the ceiling belongs here rather than in
   whichever provider refuses first. */
const CELLS_AT_ONCE = 8;

/* Collected, not failed fast: one refused cell must not abandon the run. */
export const forEachGridCell = <Subject, Variant, A, E, R>(
  cases: readonly Subject[],
  variants: readonly Variant[],
  evaluate: (
    subject: Subject,
    variant: Variant,
    caseIndex: number,
    variantIndex: number
  ) => Effect.Effect<A, E, R>
): Effect.Effect<readonly Either.Either<A, E>[], never, R> =>
  Effect.forEach(
    variants.flatMap((variant, variantIndex) =>
      cases.map(
        (subject, caseIndex) =>
          [subject, variant, caseIndex, variantIndex] as const
      )
    ),
    ([subject, variant, caseIndex, variantIndex]) =>
      Effect.either(evaluate(subject, variant, caseIndex, variantIndex)),
    { concurrency: CELLS_AT_ONCE }
  );
