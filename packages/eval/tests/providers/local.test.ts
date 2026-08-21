import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Stream } from "effect";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { makeLocalAdapter } from "../../src/providers/local";

const withSandbox = <A>(
  use: (sandbox: SandboxHandle) => Effect.Effect<A, unknown>
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const adapter = yield* makeLocalAdapter;

      const sandbox = yield* adapter.open({
        autoStopMinutes: 1,
        provider: "local",
        workspace: "/tmp/anpord-task",
      });

      const result = yield* use(sandbox);

      yield* adapter.destroy(sandbox);

      return result;
    }) as Effect.Effect<A>
  );

const collect = (sandbox: SandboxHandle, command: string) =>
  Stream.runCollect(sandbox.exec(command)).pipe(
    Effect.map((chunks) => Chunk.toReadonlyArray(chunks))
  );

const exitOf = (chunks: readonly ExecChunk[]) =>
  chunks.find((chunk) => chunk.stream === "exit")?.exitCode ?? null;

const outputOf = (chunks: readonly ExecChunk[]) =>
  chunks
    .flatMap((chunk) => (chunk.stream === "exit" ? [] : [chunk.data]))
    .join("");

describe("the local sandbox", () => {
  it("runs a real command and reports its output", async () => {
    const chunks = await withSandbox((sandbox) =>
      collect(sandbox, "echo hello")
    );

    expect(outputOf(chunks)).toContain("hello");
    expect(exitOf(chunks)).toBe(0);
  });

  /** The exit code is the verdict, so a failing command must not read as a
   * pass. This is the single assumption every scorer rests on. */
  it("reports a non-zero exit rather than swallowing it", async () => {
    const chunks = await withSandbox((sandbox) => collect(sandbox, "exit 3"));

    expect(exitOf(chunks)).toBe(3);
  });

  it("writes a file the next command can read", async () => {
    const output = await withSandbox((sandbox) =>
      Effect.gen(function* () {
        yield* sandbox.writeFile("total.mjs", "export const total = 6;\n");

        return outputOf(yield* collect(sandbox, "cat total.mjs"));
      })
    );

    expect(output).toContain("total = 6");
  });

  /** A missing binary is the signature of a command that never ran, and the
   * void gate reads it from stderr. If the shell's message never reached us,
   * a broken workspace would score as a clean failure. */
  it("surfaces a missing command on stderr", async () => {
    const chunks = await withSandbox((sandbox) =>
      collect(sandbox, "definitely-not-a-real-binary")
    );

    expect(outputOf(chunks)).toContain("command not found");
    expect(exitOf(chunks)).not.toBe(0);
  });

  it("kills a command that outlives its timeout", async () => {
    const chunks = await withSandbox((sandbox) =>
      Stream.runCollect(sandbox.exec("sleep 30", { timeoutMs: 300 })).pipe(
        Effect.map((collected) => Chunk.toReadonlyArray(collected))
      )
    );

    /* Never zero: a timeout reported as success is the vacuous pass this
       product exists to catch. */
    expect(exitOf(chunks)).not.toBe(0);
  });

  /**
   * The parent environment carries this process's provider keys, and the
   * commands running here were written by a model. AgentTrial keeps
   * credentials Redacted precisely so they never reach a sandbox, and
   * spreading process.env would have undone that at the last hop.
   */
  it("does not hand the parent environment to the sandbox", async () => {
    process.env.ANPORD_LEAK_PROBE = "should-not-be-visible";

    const output = await withSandbox((sandbox) =>
      collect(sandbox, 'echo "[$ANPORD_LEAK_PROBE]"').pipe(Effect.map(outputOf))
    );

    process.env.ANPORD_LEAK_PROBE = undefined;

    expect(output).toContain("[]");
    expect(output).not.toContain("should-not-be-visible");
  });

  it("passes the environment a caller asked for", async () => {
    const output = await withSandbox((sandbox) =>
      Stream.runCollect(
        sandbox.exec('echo "[$ANPORD_WANTED]"', {
          env: { ANPORD_WANTED: "visible" },
        })
      ).pipe(Effect.map(Chunk.toReadonlyArray), Effect.map(outputOf))
    );

    expect(output).toContain("visible");
  });

  it("cannot reattach, and says so rather than pretending", async () => {
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const adapter = yield* makeLocalAdapter;

        return yield* adapter.attach("/tmp/gone");
      }).pipe(Effect.either) as Effect.Effect<{ _tag: string }>
    );

    expect(outcome._tag).toBe("Left");
  });
});
