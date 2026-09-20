import type { EvalRun } from "@anpord/schema/domain/evals";
import { AnpordApi } from "@anpord/schema/public/client";
import { Clock, Data, Duration, Effect, Fiber, Ref, Stream } from "effect";

const TICK = 1000;

const FLOOR_POLL = 15_000;

const running = (run: EvalRun) => run.status === "running";

class EvalWaitTimeout extends Data.TaggedError("EvalWaitTimeout")<{
  readonly runId: string;
  readonly seconds: number;
}> {
  override get message() {
    return `Timed out after ${this.seconds}s waiting for ${this.runId}. The remote run was not cancelled.`;
  }
}

export const waitForRun = (
  id: string,
  onProgress: (run: EvalRun, elapsedMs: number) => Effect.Effect<void>,
  timeoutSeconds: number
) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const startedAt = yield* Clock.currentTimeMillis;
    const latest = yield* Ref.make<EvalRun | null>(null);

    const elapsed = Effect.map(
      Clock.currentTimeMillis,
      (now) => now - startedAt
    );

    const draw = Effect.gen(function* () {
      const run = yield* Ref.get(latest);

      if (run !== null) {
        yield* onProgress(run, yield* elapsed);
      }
    });

    const read = Effect.gen(function* () {
      const run = yield* api.evals.get({ payload: { id } });

      yield* Ref.set(latest, run);
      yield* onProgress(run, yield* elapsed);

      return run;
    });

    const first = yield* read;

    if (!running(first)) {
      return first;
    }

    const ticking = yield* Effect.forkScoped(
      draw.pipe(Effect.delay(Duration.millis(TICK)), Effect.forever)
    );

    const watching = yield* Effect.forkScoped(
      watchRun(id, api).pipe(
        Stream.runForEach(() => read),
        Effect.catchAll(() => Effect.void)
      )
    );

    const settled = yield* read.pipe(
      Effect.delay(Duration.millis(FLOOR_POLL)),
      Effect.repeat({ until: (run: EvalRun) => !running(run) })
    );

    yield* Fiber.interrupt(ticking);
    yield* Fiber.interrupt(watching);

    return settled;
  }).pipe(
    Effect.scoped,
    Effect.timeoutFail({
      duration: Duration.seconds(timeoutSeconds),
      onTimeout: () =>
        new EvalWaitTimeout({ runId: id, seconds: timeoutSeconds }),
    }),
    Effect.withSpan("Cli.waitForRun", { attributes: { runId: id } })
  );

const watchRun = (id: string, api: typeof AnpordApi.Service) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const { tag, token } = yield* api.evals.subscription({
        payload: { id },
      });

      const subscription = yield* Effect.promise(async () => {
        const { auth, runs } = await import("@trigger.dev/sdk");

        return await auth.withAuth({ accessToken: token }, async () =>
          runs.subscribeToRunsWithTag(tag)
        );
      });

      return Stream.fromAsyncIterable(
        subscription,
        () => new Error("the run subscription ended")
      );
    })
  );
