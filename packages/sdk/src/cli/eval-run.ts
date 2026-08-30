import type { EvalRun } from "@anpord/schema/domain/evals";
import { AnpordApi } from "@anpord/schema/public/client";
import { Clock, Duration, Effect } from "effect";

const FIRST_POLL = 2000;
const SLOWEST_POLL = 10_000;
const WIDENING = 1.5;

interface Poll {
  readonly gap: number;
  readonly run: EvalRun | null;
}

const running = ({ run }: Poll) => run === null || run.status === "running";

const widen = (gap: number) =>
  Math.min(Math.round(gap * WIDENING), SLOWEST_POLL);

export const waitForRun = (
  id: string,
  onProgress: (run: EvalRun, elapsedMs: number) => Effect.Effect<void>
) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const startedAt = yield* Clock.currentTimeMillis;

    const step = ({ gap, run }: Poll) =>
      Effect.gen(function* () {
        if (run !== null) {
          yield* Effect.sleep(Duration.millis(gap));
        }

        const next = yield* api.evals.get({ payload: { id } });
        const elapsed = (yield* Clock.currentTimeMillis) - startedAt;

        yield* onProgress(next, elapsed);

        return { gap: widen(gap), run: next };
      });

    const { run } = yield* Effect.iterate(
      { gap: FIRST_POLL, run: null } as Poll,
      { body: step, while: running }
    );

    return run ?? (yield* api.evals.get({ payload: { id } }));
  }).pipe(Effect.withSpan("Cli.waitForRun", { attributes: { runId: id } }));
