import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Stream } from "effect";
import type { SandboxName } from "../../src/domain/variant";
import { EvalSandboxLive } from "../../src/layer";
import { SandboxProvider } from "../../src/ports/sandbox";
import { BROKEN_SOURCE, TEST_SOURCE, VERIFY_COMMAND } from "../fixtures/broken-task";
import {
  hasCloudflare,
  hasDaytona,
  hasE2b,
  hasModal,
  hasUpstash,
  hasVercel,
} from "../fixtures/credentials";

const failingVerify = (provider: SandboxName) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const sandboxes = yield* SandboxProvider;
      const sandbox = yield* sandboxes.open({
        autoStopMinutes: 10,
        provider,
        workspace: "/tmp/anpord-task",
      });

      yield* sandbox.writeFile("/tmp/anpord-task/total.mjs", BROKEN_SOURCE);
      yield* sandbox.writeFile("/tmp/anpord-task/total.test.mjs", TEST_SOURCE);

      return Chunk.toReadonlyArray(
        yield* Stream.runCollect(sandbox.exec(VERIFY_COMMAND))
      );
    }).pipe(Effect.scoped, Effect.provide(EvalSandboxLive))
  );

describe("a failing command keeps its own words", () => {
  const providers = [
    ["daytona", hasDaytona],
    ["e2b", hasE2b],
    ["upstash", hasUpstash],
    ["modal", hasModal],
    ["cloudflare", hasCloudflare],
    ["vercel", hasVercel],
  ] as const;

  for (const [provider, ready] of providers) {
    it.skipIf(!ready)(
      `${provider} reports the exit code and the output together`,
      async () => {
        const chunks = await failingVerify(provider);

        const exit = chunks.find((chunk) => chunk.stream === "exit");
        const output = chunks
          .filter((chunk) => chunk.stream !== "exit")
          .map((chunk) => chunk.data)
          .join("");

        expect(exit).toBeDefined();
        expect(exit?.stream === "exit" ? exit.exitCode : 0).toBe(1);
        expect(output).toContain("total sums its items");
      },
      300_000
    );
  }
});
