import { describe, expect, it } from "bun:test";
import { Box } from "@upstash/box";
import { Effect } from "effect";
import { upstashAdapter } from "../../../src/adapters/sandbox/upstash";
import { hasUpstash } from "../../fixtures/credentials";

describe.skipIf(!hasUpstash)("an Upstash box the run is done with", () => {
  it("leaves the account, rather than only refusing commands", async () => {
    const id = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const adapter = yield* upstashAdapter();

          const sandbox = yield* adapter.open({
            autoStopMinutes: 5,
            provider: "upstash",
            workspace: "/tmp/anpord-billing",
          });

          yield* adapter.destroy(sandbox);

          return sandbox.id;
        })
      )
    );

    expect((await Box.list()).some((box) => box.id === id)).toBe(false);
  }, 120_000);
});
