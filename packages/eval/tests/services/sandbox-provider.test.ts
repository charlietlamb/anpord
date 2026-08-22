import { describe, expect, it } from "bun:test";
import { Effect, Layer, Ref, Stream } from "effect";
import type { SandboxHandle } from "../../src/ports/sandbox";
import { SandboxAdapters, SandboxProvider } from "../../src/ports/sandbox";
import { SandboxProviderLive } from "../../src/services/sandbox-provider";

interface Live {
  readonly destroyed: number;
  readonly max: number;
  readonly now: number;
  readonly opened: number;
}

const scriptedAdapters = (live: Ref.Ref<Live>) =>
  Layer.succeed(
    SandboxAdapters,
    SandboxAdapters.of({
      resolve: (provider) =>
        Effect.succeed({
          attach: (id) => Effect.succeed({ id } as SandboxHandle),
          destroy: () =>
            Ref.update(live, (state) => ({
              ...state,
              destroyed: state.destroyed + 1,
              now: state.now - 1,
            })),
          open: () =>
            Ref.updateAndGet(live, (state) => ({
              ...state,
              max: Math.max(state.max, state.now + 1),
              now: state.now + 1,
              opened: state.opened + 1,
            })).pipe(
              Effect.map(
                (state): SandboxHandle => ({
                  exec: () => Stream.empty,
                  id: `sbx-${state.opened}`,
                  provider,
                  streaming: true,
                  writeFile: () => Effect.void,
                })
              )
            ),
          provider,
        }),
    })
  );

const openSandbox = {
  autoStopMinutes: 5,
  provider: "e2b",
  workspace: "/tmp/x",
} as const;

const run = <A, E>(
  effect: Effect.Effect<A, E, SandboxProvider>,
  live: Ref.Ref<Live>
) =>
  effect.pipe(
    Effect.provide(
      SandboxProviderLive.pipe(Layer.provide(scriptedAdapters(live)))
    )
  );

describe("SandboxProviderLive", () => {
  /* The bug this exists to catch: wrapping acquireRelease with withPermits
     returns the permit as soon as the sandbox is acquired, so the cap admits
     an unbounded number of live sandboxes and fails open at exactly the
     provider limit it is there to enforce. */
  it("never exceeds the configured concurrency", async () => {
    const live = await Effect.runPromise(
      Ref.make<Live>({ destroyed: 0, max: 0, now: 0, opened: 0 })
    );

    const openOne = Effect.scoped(
      Effect.gen(function* () {
        const provider = yield* SandboxProvider;
        yield* provider.open(openSandbox);
        yield* Effect.sleep("20 millis");
      })
    );

    await Effect.runPromise(
      run(
        Effect.all(
          Array.from({ length: 12 }, () => openOne),
          { concurrency: 12 }
        ),
        live
      )
    );

    const state = await Effect.runPromise(Ref.get(live));

    expect(state.opened).toBe(12);
    expect(state.max).toBeLessThanOrEqual(5);
  });

  it("destroys every sandbox it opens when the scope closes", async () => {
    const live = await Effect.runPromise(
      Ref.make<Live>({ destroyed: 0, max: 0, now: 0, opened: 0 })
    );

    await Effect.runPromise(
      run(
        Effect.scoped(
          Effect.gen(function* () {
            const provider = yield* SandboxProvider;
            yield* provider.open(openSandbox);
            yield* provider.open(openSandbox);
          })
        ),
        live
      )
    );

    const state = await Effect.runPromise(Ref.get(live));

    expect(state.opened).toBe(2);
    expect(state.destroyed).toBe(2);
    expect(state.now).toBe(0);
  });

  /* A sandbox must be released even when the work inside the scope fails,
     because a leaked sandbox is a bill rather than an untidy test. */
  it("destroys the sandbox when the caller fails", async () => {
    const live = await Effect.runPromise(
      Ref.make<Live>({ destroyed: 0, max: 0, now: 0, opened: 0 })
    );

    await Effect.runPromise(
      run(
        Effect.scoped(
          Effect.gen(function* () {
            const provider = yield* SandboxProvider;
            yield* provider.open(openSandbox);
            return yield* Effect.fail("boom" as const);
          })
        ).pipe(Effect.catchAll(() => Effect.void)),
        live
      )
    );

    const state = await Effect.runPromise(Ref.get(live));

    expect(state.destroyed).toBe(1);
    expect(state.now).toBe(0);
  });
});
