import {
  EVAL_TAIL_PAGE,
  type EvalBatchTail,
  type EvalTailMark,
} from "@anpord/schema/domain/eval-tail";
import type { AnpordApi } from "@anpord/schema/public/client";
import { Duration, Effect, Ref, Schedule, Stream } from "effect";

const FLOOR = Duration.seconds(5);

const SETTLE = Duration.millis(300);

const bellOf = (id: string, api: typeof AnpordApi.Service) =>
  Stream.unwrapScoped(
    Effect.gen(function* () {
      const { tag, token } = yield* api.runner.subscribe({
        payload: { id },
      });

      const subscription = yield* Effect.acquireRelease(
        Effect.promise(async () => {
          const { auth, runs } = await import("@trigger.dev/sdk");

          return await auth.withAuth({ accessToken: token }, async () =>
            runs.subscribeToRunsWithTag(tag)
          );
        }),
        (open) => Effect.sync(() => open.unsubscribe())
      );

      return Stream.async<void>((emit) => {
        const listen = async () => {
          for await (const _run of subscription) {
            emit.single(undefined);
          }
        };

        listen()
          .catch(() => undefined)
          .finally(() => emit.end());
      });
    })
  ).pipe(Stream.catchAll(() => Stream.empty));

export const followBatch = (id: string, api: typeof AnpordApi.Service) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const marks = yield* Ref.make<readonly EvalTailMark[]>([]);

      const read = Ref.get(marks).pipe(
        Effect.flatMap((after) => api.runner.tail({ payload: { after, id } })),
        Effect.tap((tail) => Ref.set(marks, tail.next))
      );

      const caughtUp = Stream.repeatEffect(read).pipe(
        Stream.takeUntil((tail) => tail.events.length < EVAL_TAIL_PAGE)
      );

      const wakes = Stream.merge(
        bellOf(id, api),
        Stream.fromSchedule(Schedule.spaced(FLOOR)).pipe(Stream.as(undefined))
      ).pipe(Stream.debounce(SETTLE));

      return Stream.concat(Stream.void, wakes).pipe(
        Stream.flatMap(() => caughtUp),
        Stream.takeUntil((tail: EvalBatchTail) => !tail.running)
      );
    })
  );
