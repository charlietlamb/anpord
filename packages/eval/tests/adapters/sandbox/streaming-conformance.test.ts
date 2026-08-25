import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Stream } from "effect";
import { makeCloudflareAdapter } from "../../../src/adapters/sandbox/cloudflare";
import { makeDaytonaAdapter } from "../../../src/adapters/sandbox/daytona";
import { makeE2BAdapter } from "../../../src/adapters/sandbox/e2b";
import { makeModalAdapter } from "../../../src/adapters/sandbox/modal";
import { makeUpstashAdapter } from "../../../src/adapters/sandbox/upstash";
import { makeVercelAdapter } from "../../../src/adapters/sandbox/vercel";
import type {
  ExecChunk,
  SandboxAdapterShape,
} from "../../../src/ports/sandbox";
import {
  hasCloudflare,
  hasDaytona,
  hasModal,
  hasUpstash,
  hasVercel,
} from "../../fixtures/credentials";
import { makeLocalAdapter } from "../../support/local-sandbox";

const GAP_SECONDS = 3;
const TOLERANCE_MS = 500;

const SPLIT_COMMAND = `echo first; sleep ${GAP_SECONDS}; echo second`;

const quietCommand = (seconds: number) =>
  `echo working; sleep ${seconds}; echo done`;

const collect = (
  adapter: SandboxAdapterShape,
  command = SPLIT_COMMAND,
  timeoutMs = 60_000
) =>
  Effect.gen(function* () {
    const sandbox = yield* adapter.open({
      autoStopMinutes: 5,
      provider: adapter.provider,
      workspace: "/tmp/anpord-conformance",
    });

    const chunks = yield* Stream.runCollect(
      sandbox.exec(command, { timeoutMs })
    ).pipe(Effect.map(Chunk.toReadonlyArray));

    yield* adapter.destroy(sandbox);

    return { chunks, streaming: sandbox.streaming };
  });

const run = (
  adapter: Effect.Effect<SandboxAdapterShape>,
  command?: string,
  timeoutMs?: number
) =>
  Effect.runPromise(
    adapter.pipe(
      Effect.flatMap((it) => collect(it, command, timeoutMs)),
      Effect.scoped
    ) as Effect.Effect<{
      readonly chunks: readonly ExecChunk[];
      readonly streaming: boolean;
    }>
  );

const conforms = (
  name: string,
  adapter: Effect.Effect<SandboxAdapterShape>,
  quietSeconds = 1
) =>
  describe(`${name} streams output`, () => {
    it("reports the moment each chunk was produced", async () => {
      const { chunks, streaming } = await run(adapter);

      const output = chunks.filter((chunk) => chunk.stream !== "exit");

      expect(output.length).toBeGreaterThan(0);

      const first = Math.min(...output.map((chunk) => chunk.at));
      const last = Math.max(...output.map((chunk) => chunk.at));

      if (!streaming) {
        expect(last - first).toBeLessThan(TOLERANCE_MS);
        return;
      }

      expect(last - first).toBeGreaterThanOrEqual(
        GAP_SECONDS * 1000 - TOLERANCE_MS
      );
    }, 120_000);

    it("waits for a command that goes quiet before it finishes", async () => {
      const { chunks } = await run(
        adapter,
        quietCommand(quietSeconds),
        (quietSeconds + 60) * 1000
      );
      const last = chunks.at(-1);

      expect(last?.stream).toBe("exit");
      expect(last?.stream === "exit" ? last.exitCode : null).toBe(0);
    }, 420_000);

    it("ends with an exit code", async () => {
      const { chunks } = await run(adapter);

      expect(chunks.at(-1)?.stream).toBe("exit");
    }, 120_000);
  });

conforms("local", makeLocalAdapter);

describe.skipIf(!hasDaytona)("daytona", () => {
  conforms("daytona", makeDaytonaAdapter, 240);
});

describe.skipIf(!process.env.E2B_API_KEY)("e2b", () => {
  conforms("e2b", makeE2BAdapter);
});

describe.skipIf(!hasUpstash)("upstash", () => {
  conforms("upstash", makeUpstashAdapter);
});

describe.skipIf(!hasModal)("modal", () => {
  conforms("modal", makeModalAdapter);
});

describe.skipIf(!hasCloudflare)("cloudflare", () => {
  conforms("cloudflare", makeCloudflareAdapter);
});

describe.skipIf(!hasVercel)("vercel", () => {
  conforms("vercel", makeVercelAdapter);
});
