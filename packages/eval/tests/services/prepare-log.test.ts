import { describe, expect, test } from "bun:test";
import { Effect, HashMap, Layer, Logger, Option, Stream } from "effect";
import { trialSecrets } from "../../src/domain/trial-secrets";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { Suspender } from "../../src/services/suspender";
import { runPrepare } from "../../src/services/workspace-setup";
import { emptyEnvCredential } from "../fixtures/credentials";
import { declinesEverything } from "../fixtures/declines-everything";

const RESULT = 'ANPORD_PREPARE_RESULT={"secretKey":"am_sk_test_x"}\n';

const Immediate = Layer.succeed(
  Suspender,
  Suspender.of({ waitFor: () => Effect.void })
);

const base = {
  ...declinesEverything,
  home: "/home/agent",
  id: "test",
  provider: "daytona",
  writeFile: () => Effect.void,
} as const;

const streamed = (chunks: readonly ExecChunk[]): SandboxHandle => ({
  ...base,
  exec: (command) =>
    Stream.fromIterable<ExecChunk>(
      command.startsWith("rm")
        ? [{ at: 0, exitCode: 0, stream: "exit" }]
        : chunks
    ),
});

const polled = (reads: readonly string[]): SandboxHandle => {
  let read = 0;

  return {
    ...base,
    exec: () =>
      Stream.fromIterable<ExecChunk>([{ at: 0, exitCode: 0, stream: "exit" }]),
    resumable: Option.some({
      progress: () =>
        Effect.sync(() => {
          const stdout = reads[Math.min(read, reads.length - 1)] ?? "";
          read += 1;

          return {
            exitCode: read >= reads.length ? 0 : null,
            stderr: "",
            stdout,
          };
        }),
      start: () => Effect.succeed({ id: "cmd", session: "session" }),
    }),
  };
};

const logged = async (
  sandbox: SandboxHandle,
  secrets: readonly string[] = []
) => {
  const lines: string[] = [];
  const recording = Logger.replace(
    Logger.defaultLogger,
    Logger.make(({ annotations, message }) => {
      const output = HashMap.get(annotations, "output");
      lines.push(
        `${String(message)} ${Option.isSome(output) ? String(output.value) : ""}`
      );
    })
  );

  const prepared = await Effect.runPromise(
    runPrepare({
      prepare: { name: "seedKeys", source: "export {}" },
      sandbox,
      secrets,
      workspace: "/tmp/ws",
    }).pipe(Effect.provide(Layer.merge(Immediate, recording)))
  );

  return { lines, prepared };
};

describe("what a prepare shows while it runs", () => {
  test("a streamed prepare logs its progress but never its result line", async () => {
    const { lines, prepared } = await logged(
      streamed([
        { at: 0, data: "installing\n", stream: "stdout" },
        { at: 1, data: "npm warn deprecated\n", stream: "stderr" },
        { at: 2, data: RESULT, stream: "stdout" },
        { at: 3, exitCode: 0, stream: "exit" },
      ])
    );

    expect(prepared).toEqual({ secretKey: "am_sk_test_x" });
    expect(lines.filter((line) => line.startsWith("preparing"))).toEqual([
      "preparing installing\nnpm warn deprecated",
    ]);
  });

  test("a result line split across two polls is still kept out", async () => {
    const { lines, prepared } = await logged(
      polled(["", "installing\nANPORD_PREPARE_RES", `installing\n${RESULT}`])
    );

    expect(prepared).toEqual({ secretKey: "am_sk_test_x" });
    expect(lines.filter((line) => line.startsWith("preparing"))).toEqual([
      "preparing installing",
    ]);
  });

  test("a key the prepare prints itself is redacted", async () => {
    const { lines } = await logged(
      streamed([
        {
          at: 0,
          data: "created am_sk_test_abc123 for the app\n",
          stream: "stdout",
        },
        { at: 1, data: RESULT, stream: "stdout" },
        { at: 2, exitCode: 0, stream: "exit" },
      ])
    );

    expect(lines.filter((line) => line.startsWith("preparing"))).toEqual([
      "preparing created [redacted] for the app",
    ]);
  });

  test("a failed prepare reports its error with keys redacted", async () => {
    const exit = await Effect.runPromiseExit(
      runPrepare({
        prepare: { name: "seedKeys", source: "export {}" },
        sandbox: streamed([
          {
            at: 0,
            data: "401 for Authorization: Bearer 9f8e7d6c5b4a39281706f5e4d3c2b1a0\n",
            stream: "stderr",
          },
          { at: 1, exitCode: 1, stream: "exit" },
        ]),
        secrets: [],
        workspace: "/tmp/ws",
      }).pipe(Effect.provide(Immediate), Effect.flip)
    );

    expect(exit._tag === "Success" ? exit.value.reason : null).toBe(
      "401 for Authorization: Bearer [redacted]"
    );
  });

  const forwarded = trialSecrets({
    forwarded: {
      API_BASE: "http://localhost:3000/v1",
      STRIPE_KEY: "stripe9Tq2Lw8Zr4Vb6Nc1",
    },
    harnessCredential: emptyEnvCredential,
  });

  test("a forwarded key the prepare prints is redacted, and a plain address is kept", async () => {
    const { lines } = await logged(
      streamed([
        {
          at: 0,
          data: "calling http://localhost:3000/v1 with stripe9Tq2Lw8Zr4Vb6Nc1\n",
          stream: "stdout",
        },
        { at: 1, data: RESULT, stream: "stdout" },
        { at: 2, exitCode: 0, stream: "exit" },
      ]),
      forwarded
    );

    expect(lines.filter((line) => line.startsWith("preparing"))).toEqual([
      "preparing calling http://localhost:3000/v1 with [redacted]",
    ]);
  });

  test("a failed prepare that prints a forwarded key reports it redacted", async () => {
    const exit = await Effect.runPromiseExit(
      runPrepare({
        prepare: { name: "seedKeys", source: "export {}" },
        sandbox: streamed([
          {
            at: 0,
            data: "stripe9Tq2Lw8Zr4Vb6Nc1 was refused by http://localhost:3000/v1\n",
            stream: "stderr",
          },
          { at: 1, exitCode: 1, stream: "exit" },
        ]),
        secrets: forwarded,
        workspace: "/tmp/ws",
      }).pipe(Effect.provide(Immediate), Effect.flip)
    );

    expect(exit._tag === "Success" ? exit.value.reason : null).toBe(
      "[redacted] was refused by http://localhost:3000/v1"
    );
  });
});
