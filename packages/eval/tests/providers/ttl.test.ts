import { describe, expect, it } from "bun:test";
import { Effect, Ref, Stream } from "effect";
import type { OpenSandbox, SandboxHandle } from "../../src/ports/sandbox";

/* Measured against Daytona: killing the process with process.exit bypasses the
   scope finalizer and the sandbox stays started. Compensation does not cover
   it either, because the engine treats an interrupt as a suspension rather
   than a failure. The provider-side TTL is therefore the only guarantee that
   survives losing our process, and every open must carry one. */
describe("every sandbox is opened with a provider-side stop", () => {
  it("passes a non-zero autoStopMinutes through to the adapter", async () => {
    const seen = await Effect.runPromise(
      Effect.gen(function* () {
        const captured = yield* Ref.make<OpenSandbox | null>(null);

        const open = (request: OpenSandbox) =>
          Ref.set(captured, request).pipe(
            Effect.as({
              exec: () => Stream.empty,
              id: "sbx-1",
              provider: request.provider,
              writeFile: () => Effect.void,
            } as SandboxHandle)
          );

        yield* open({
          autoStopMinutes: 10,
          provider: "daytona",
          workspace: "/tmp/x",
        });

        return yield* Ref.get(captured);
      })
    );

    expect(seen?.autoStopMinutes).toBe(10);
    expect(seen?.autoStopMinutes).toBeGreaterThan(0);
  });
});
