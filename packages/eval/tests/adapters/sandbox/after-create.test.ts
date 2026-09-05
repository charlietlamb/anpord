import { describe, expect, it } from "bun:test";
import { Effect, Stream } from "effect";
import { settingUp } from "../../../src/adapters/sandbox/after-create";
import { sandboxUnavailable } from "../../../src/domain/errors";
import type { SandboxHandle } from "../../../src/ports/sandbox";
import { notResumableFixture } from "../../fixtures/not-resumable";

const handle: SandboxHandle = {
  exec: () => Stream.empty,
  home: "/tmp",
  id: "sbx-created",
  provider: "e2b",
  ...notResumableFixture,
  streaming: true,
  writeFile: () => Effect.void,
};

describe("a sandbox whose setup fails is destroyed", () => {
  /* The defect this exists to catch: `Effect.tap` with no error path let a
     failing mkdir fail the open while the sandbox kept running, and its id
     never left the closure that created it. */
  it("destroys the sandbox when the setup step fails", async () => {
    const destroyed: string[] = [];

    const outcome = await Effect.runPromise(
      Effect.either(
        settingUp(
          Effect.fail(sandboxUnavailable("e2b", "mkdir refused")),
          handle,
          () => {
            destroyed.push(handle.id);
            return Promise.resolve();
          }
        )
      )
    );

    expect(outcome._tag).toBe("Left");
    expect(destroyed).toEqual(["sbx-created"]);
  });

  it("keeps the sandbox when the setup step succeeds", async () => {
    const destroyed: string[] = [];

    const opened = await Effect.runPromise(
      settingUp(Effect.void, handle, () => {
        destroyed.push(handle.id);
        return Promise.resolve();
      })
    );

    expect(opened.id).toBe("sbx-created");
    expect(destroyed).toEqual([]);
  });

  /* A provider that refuses the delete too must not turn a leak into a
     crash: the open still fails, and the leak is reported by the reaper. */
  it("still fails when the destroy itself rejects", async () => {
    const outcome = await Effect.runPromise(
      Effect.either(
        settingUp(
          Effect.fail(sandboxUnavailable("e2b", "mkdir refused")),
          handle,
          () => Promise.reject(new Error("delete refused"))
        )
      )
    );

    expect(outcome._tag).toBe("Left");
  });
});
