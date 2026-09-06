import { Effect, Option, PubSub, Ref, Stream } from "effect";
import type { GridRunState } from "./state";

export interface LiveRuns {
  readonly changes: Stream.Stream<GridRunState>;
  /* Each entry holds every trial's untruncated journal, so keeping finished runs
     grows without bound. The record answers for them afterwards. */
  readonly forget: (id: string) => Effect.Effect<void>;
  readonly get: (id: string) => Effect.Effect<Option.Option<GridRunState>>;
  readonly publish: (state: GridRunState) => Effect.Effect<void>;
  readonly update: (
    id: string,
    change: (state: GridRunState) => GridRunState
  ) => Effect.Effect<void>;
}

export const makeLiveRuns = Effect.gen(function* () {
  const runs = yield* Ref.make(new Map<string, GridRunState>());

  /* Dropping: a slow reader must not stall a run, and every message carries the
     whole run so a missed frame costs nothing. */
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
