import { describe, expect, it } from "bun:test";
import { Effect, Layer, Ref, Stream } from "effect";
import {
  type OpenSandbox,
  SandboxAdapters,
  type SandboxHandle,
  SandboxProvider,
} from "../../../src/ports/sandbox";
import { SandboxProviderLive } from "../../../src/services/sandbox-provider";
import { notResumableFixture } from "../../fixtures/not-resumable";

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
                home: "/tmp",
                id: "sbx-1",
                provider,
                ...notResumableFixture,
                streaming: true,
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
