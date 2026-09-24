import { describe, expect, it } from "bun:test";
import { Effect, Stream } from "effect";
import { providerAdapter } from "../../../src/adapters/sandbox/provider-adapter";
import {
  type SandboxUnavailable,
  sandboxUnavailable,
} from "../../../src/domain/errors";
import type { SandboxHandle } from "../../../src/ports/sandbox";
import { declinesEverything } from "../../fixtures/declines-everything";

const handleFor = (id: string, workspace: string): SandboxHandle => ({
  exec: () => Stream.empty,
  home: workspace,
  id,
  provider: "e2b",
  ...declinesEverything,
  writeFile: () => Effect.void,
});

const opening = (
  makeWorkspace: Effect.Effect<unknown, SandboxUnavailable>,
  discard: Effect.Effect<unknown, unknown>
) => {
  const discarded: string[] = [];

  const adapter = providerAdapter({
    connect: Effect.succeed,
    create: () => Effect.succeed("sbx-created"),
    destroy: () => Effect.void,
    discard: (id) =>
      Effect.sync(() => discarded.push(id)).pipe(Effect.zipRight(discard)),
    handleFor,
    home: "/home/user",
    makeWorkspace: () => makeWorkspace,
    provider: "e2b",
  });

  return Effect.runPromise(
    Effect.either(
      adapter.open({
        autoStopMinutes: 5,
        provider: "e2b",
        workspace: "/tmp/anpord-task",
      })
    )
  ).then((outcome) => ({ discarded, outcome }));
};

describe("a sandbox whose setup fails is discarded", () => {
  it("discards the sandbox when the workspace cannot be made", async () => {
    const { discarded, outcome } = await opening(
      Effect.fail(sandboxUnavailable("e2b", "mkdir refused")),
      Effect.void
    );

    expect(outcome._tag).toBe("Left");
    expect(discarded).toEqual(["sbx-created"]);
  });

  it("keeps the sandbox when the workspace is made", async () => {
    const { discarded, outcome } = await opening(Effect.void, Effect.void);

    expect(outcome._tag).toBe("Right");
    expect(discarded).toEqual([]);
  });

  it("still fails when the discard itself fails", async () => {
    const { outcome } = await opening(
      Effect.fail(sandboxUnavailable("e2b", "mkdir refused")),
      Effect.fail(new Error("delete refused"))
    );

    expect(outcome._tag).toBe("Left");
  });
});
