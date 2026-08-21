import { Effect, Option, PubSub, Ref, Stream } from "effect";
import type { GridRunState } from "./state";

interface LiveRuns {
  readonly changes: Stream.Stream<GridRunState>;
  /** Drops a run once it is terminal. Each entry holds every trial's full
   * journal, untruncated, so keeping finished runs grows without bound for
   * the life of the process. The record answers for them afterwards. */
  readonly forget: (id: string) => Effect.Effect<void>;
  readonly get: (id: string) => Effect.Effect<Option.Option<GridRunState>>;
  readonly publish: (state: GridRunState) => Effect.Effect<void>;
  readonly update: (
    id: string,
    change: (state: GridRunState) => GridRunState
  ) => Effect.Effect<void>;
}

/**
 * The in-flight view of runs, kept apart from the service that schedules
 * them.
 *
 * A read model and a decision-maker change for different reasons: this exists
 * so a subscriber can watch a cell settle before the run has finished, and
 * the database is the record either way. Separating them is what the effect
 * guidance asks for, and it keeps the unbounded-growth question in one file.
 */
export const makeLiveRuns = Effect.gen(function* () {
  const runs = yield* Ref.make(new Map<string, GridRunState>());

  /* Bounded and dropping: a slow reader must never stall a run that is
     spending money, and a missed frame costs nothing because every message
     carries the whole run. */
  const changes = yield* PubSub.dropping<GridRunState>(64);

  const publish = (state: GridRunState) =>
    Ref.update(runs, (all) => new Map(all).set(state.id, state)).pipe(
      Effect.zipRight(PubSub.publish(changes, state)),
      Effect.asVoid
    );

  return {
    changes: Stream.fromPubSub(changes),
    forget: (id: string) =>
      Ref.update(runs, (all) => {
        const next = new Map(all);

        next.delete(id);

        return next;
      }),
    get: (id: string) =>
      Ref.get(runs).pipe(Effect.map((all) => Option.fromNullable(all.get(id)))),
    publish,
    update: (id: string, change: (state: GridRunState) => GridRunState) =>
      Ref.get(runs).pipe(
        Effect.flatMap((all) => {
          const current = all.get(id);

          return current === undefined ? Effect.void : publish(change(current));
        })
      ),
  } satisfies LiveRuns;
});
