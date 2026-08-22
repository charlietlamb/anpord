import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Stream } from "effect";
import { makeDaytonaAdapter } from "../../../src/adapters/sandbox/daytona";
import { makeE2BAdapter } from "../../../src/adapters/sandbox/e2b";
import { makeLocalAdapter } from "../../../src/adapters/sandbox/local";
import type {
  ExecChunk,
  SandboxAdapterShape,
} from "../../../src/ports/sandbox";
import { hasDaytona } from "../../fixtures/credentials";

/* Long enough that a provider delivering everything at the end cannot be
   mistaken for one delivering as it goes. */
const GAP_SECONDS = 3;
const TOLERANCE_MS = 500;

/** Prints, waits, prints again. The two lines are produced seconds apart, so
 * an adapter that streams reports two different moments and one that answers
 * in a single piece reports the same moment twice. */
const SPLIT_COMMAND = `echo first; sleep ${GAP_SECONDS}; echo second`;

/* Longer than Daytona keeps a log stream open. Measured: for a 300 second
   command the stream returned at 181 with the process still running, so an
   adapter that treats the stream ending as the command ending reports a live
   command as unavailable. */
const LONG_QUIET_COMMAND = "echo working; sleep 240; echo done";

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

/**
 * One suite every provider answers, so a new adapter proves it streams rather
 * than being taken at its word.
 *
 * This is the test that would have caught the original bug: the harness read
 * a clock when a line arrived, the provider handed over everything at once,
 * and a five second command was recorded as taking no time at all.
 */
const conforms = (name: string, adapter: Effect.Effect<SandboxAdapterShape>) =>
  describe(`${name} streams output`, () => {
    it("reports the moment each chunk was produced", async () => {
      const { chunks, streaming } = await run(adapter);

      const output = chunks.filter((chunk) => chunk.stream !== "exit");

      expect(output.length).toBeGreaterThan(0);

      const first = Math.min(...output.map((chunk) => chunk.at));
      const last = Math.max(...output.map((chunk) => chunk.at));

      if (!streaming) {
        /* An adapter is allowed to answer in one piece, but it has to say
             so. What it may never do is claim to stream and then hand over
             timestamps that are all equal. */
        expect(last - first).toBeLessThan(TOLERANCE_MS);
        return;
      }

      expect(last - first).toBeGreaterThanOrEqual(
        GAP_SECONDS * 1000 - TOLERANCE_MS
      );
    }, 120_000);

    /** The failure this caught: the log stream ends when output stops, not
     * when the process does, so a command that goes quiet and kept working
     * was reported as unavailable rather than waited for. */
    it("waits for a command that goes quiet before it finishes", async () => {
      const { chunks } = await run(adapter, LONG_QUIET_COMMAND, 600_000);
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
  conforms("daytona", makeDaytonaAdapter);
});

describe.skipIf(!process.env.E2B_API_KEY)("e2b", () => {
  conforms("e2b", makeE2BAdapter);
});
