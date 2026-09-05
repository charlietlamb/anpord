import { describe, expect, it } from "bun:test";
import { Box } from "@upstash/box";
import { Effect } from "effect";
import { makeUpstashAdapter } from "../../../src/adapters/sandbox/upstash";
import { hasUpstash } from "../../fixtures/credentials";

/* What the conformance suite cannot cover: it asks the provider whether a
   destroyed sandbox still answers, which proves the handle is gone but not
   that Upstash stopped billing for the box. Only Upstash's own account
   listing says that, so only Upstash can be asked. The rest of the adapter's
   behaviour is asserted for every provider in ./conformance. */

describe.skipIf(!hasUpstash)("an Upstash box the run is done with", () => {
  it("leaves the account, rather than only refusing commands", async () => {
    const id = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const adapter = yield* makeUpstashAdapter;

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
