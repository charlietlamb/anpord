import { describe, expect, it } from "bun:test";
import { Effect, Layer, Ref, Stream } from "effect";
import {
  type OpenSandbox,
  SandboxAdapters,
  type SandboxHandle,
  SandboxProvider,
} from "../../src/ports/sandbox";
import { SandboxProviderLive } from "../../src/services/sandbox-provider";

/**
 * Measured against Daytona: killing the process with `process.exit` bypasses
 * the scope finalizer and the sandbox stays started. Compensation does not
 * cover it either, because the workflow engine treats an interrupt as a
 * suspension rather than a failure.
 *
 * The provider-side stop is therefore the only cleanup guarantee that survives
 * losing our process, so every open has to carry one. This asserts against the
 * real provider layer rather than a local stub, because the risk is a caller
 * forgetting to pass it, and only production code can forget.
 */
const recordingAdapters = (seen: Ref.Ref<OpenSandbox[]>) =>
  Layer.succeed(
    SandboxAdapters,
    SandboxAdapters.of({
      resolve: (provider) =>
        Effect.succeed({
          attach: () => Effect.succeed({ id: "sbx" } as SandboxHandle),
          destroy: () => Effect.void,
          open: (request) =>
            Ref.update(seen, (all) => [...all, request]).pipe(
              Effect.as({
                exec: () => Stream.empty,
                id: "sbx-1",
                provider,
                writeFile: () => Effect.void,
              } as SandboxHandle)
            ),
          provider,
        }),
    })
  );

describe("every sandbox carries a provider-side stop", () => {
  it("passes autoStopMinutes through the provider to the adapter", async () => {
    const opened = await Effect.runPromise(
      Effect.gen(function* () {
        const seen = yield* Ref.make<OpenSandbox[]>([]);

        yield* Effect.scoped(
          Effect.gen(function* () {
            const sandboxes = yield* SandboxProvider;
            yield* sandboxes.open({
              autoStopMinutes: 15,
              provider: "daytona",
              workspace: "/tmp/anpord-task",
            });
          })
        ).pipe(
          Effect.provide(
            SandboxProviderLive.pipe(Layer.provide(recordingAdapters(seen)))
          )
        );

        return yield* Ref.get(seen);
      })
    );

    expect(opened).toHaveLength(1);
    expect(opened[0]?.autoStopMinutes).toBe(15);
  });

  /* A zero or missing stop is the leak: the sandbox outlives every process
     that knows about it and bills until the provider's own default. */
  it("never opens a sandbox without a stop", async () => {
    const opened = await Effect.runPromise(
      Effect.gen(function* () {
        const seen = yield* Ref.make<OpenSandbox[]>([]);

        yield* Effect.scoped(
          Effect.gen(function* () {
            const sandboxes = yield* SandboxProvider;
            yield* sandboxes.open({
              autoStopMinutes: 10,
              provider: "e2b",
              workspace: "/tmp/anpord-task",
            });
          })
        ).pipe(
          Effect.provide(
            SandboxProviderLive.pipe(Layer.provide(recordingAdapters(seen)))
          )
        );

        return yield* Ref.get(seen);
      })
    );

    for (const request of opened) {
      expect(request.autoStopMinutes).toBeGreaterThan(0);
    }
  });
});
