import { Clock, Duration, Effect, Either, Ref } from "effect";
import { TrialTimedOut } from "../domain/errors";

export type BudgetedTurn = <A, E, R>(
  turn: (remaining: Duration.Duration) => Effect.Effect<A, E, R>
) => Effect.Effect<A, E | TrialTimedOut, R>;

export const turnBudget = (timeoutMs: number) =>
  Effect.map(
    Ref.make(0),
    (spent): BudgetedTurn =>
      (turn) =>
        Effect.gen(function* () {
          const remainingMs = timeoutMs - (yield* Ref.get(spent));
          if (remainingMs <= 0) {
            return yield* new TrialTimedOut({ timeoutMs });
          }
          const started = yield* Clock.currentTimeMillis;
          const result = yield* turn(Duration.millis(remainingMs)).pipe(
            Effect.timeoutFail({
              duration: Duration.millis(remainingMs),
              onTimeout: () => new TrialTimedOut({ timeoutMs }),
            }),
            Effect.either
          );
          const elapsed = (yield* Clock.currentTimeMillis) - started;
          yield* Ref.update(spent, (total) => total + elapsed);
          if (Either.isLeft(result) && elapsed >= remainingMs) {
            return yield* new TrialTimedOut({ timeoutMs });
          }
          return yield* result;
        })
  );
