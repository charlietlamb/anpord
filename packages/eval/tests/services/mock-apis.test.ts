import { describe, expect, test } from "bun:test";
import {
  API_PROGRAM,
  API_READY,
  type ApiCall,
} from "@anpord/schema/domain/api-mocks";
import { validationCapture } from "@anpord/schema/domain/eval-validations";
import { Effect, Stream } from "effect";
import type { RequestedProfile } from "../../src/domain/harness-profile";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { apiInstructions, startMockApis } from "../../src/services/mock-apis";
import { declinesEverything } from "../fixtures/declines-everything";

const manifest = [
  {
    name: "catalog",
    url: "http://127.0.0.1:1234",
    endpoints: [{ method: "GET", path: "/items/:id" }],
  },
];
const profile: RequestedProfile = {
  name: "api",
  files: { [API_PROGRAM]: JSON.stringify({ entry: ".anpord/api/server.mjs" }) },
  env: null,
  install: null,
  run: null,
  systemPrompt: null,
};
const capture = validationCapture();
const call: ApiCall = {
  api: "catalog",
  index: 0,
  method: "GET",
  path: "/items/fixture",
  matched: true,
  startedAt: 100,
  durationMs: 2,
  status: 200,
  error: null,
  logs: [],
  input: capture({ params: { id: "fixture" } }),
  output: capture({ status: 200, body: { name: "Fixture" } }),
};

const sandbox = (
  journal: () => string,
  ready = `${API_READY}${JSON.stringify(manifest)}\n`
): SandboxHandle => ({
  ...declinesEverything,
  home: "/home/test",
  id: "test",
  provider: "e2b",
  writeFile: () => Effect.void,
  exec: (command) =>
    command.startsWith("node")
      ? Stream.concat(
          Stream.make<ExecChunk[]>({ stream: "stdout", at: 0, data: ready }),
          Stream.never
        )
      : Stream.make<ExecChunk[]>(
          { stream: "stdout", at: 0, data: journal() },
          { stream: "exit", at: 1, exitCode: 0 }
        ),
});

describe("shared API mock trial runtime", () => {
  test("discovers APIs and collects evidence once across agent and validator phases", () =>
    Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          let entries = [call];
          const runtime = yield* startMockApis({
            profile,
            workspace: "/workspace",
            sandbox: sandbox(() =>
              entries.map((entry) => JSON.stringify(entry)).join("\n")
            ),
          });
          expect(apiInstructions(runtime.manifest)).toContain(
            "catalog: http://127.0.0.1:1234"
          );
          expect(yield* runtime.collect()).toMatchObject([
            {
              _tag: "ToolCall",
              name: "catalog GET /items/fixture",
              startedAt: 100,
              at: 102,
            },
          ]);
          expect(yield* runtime.collect()).toEqual([]);
          entries = [...entries, { ...call, index: 1 }];
          expect(yield* runtime.collect()).toHaveLength(1);
          yield* runtime.check;
        })
      )
    ));

  test("keeps failure evidence available before failing the trial", () =>
    Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const runtime = yield* startMockApis({
            profile,
            workspace: "/workspace",
            sandbox: sandbox(() =>
              JSON.stringify({ ...call, error: "Handler threw", status: 500 })
            ),
          });
          expect(yield* runtime.collect()).toMatchObject([
            { status: "error", error: "Handler threw" },
          ]);
          expect((yield* Effect.either(runtime.check))._tag).toBe("Left");
        })
      )
    ));

  test("rejects corrupt evidence and invalid readiness", async () => {
    const evidence = Effect.scoped(
      Effect.gen(function* () {
        const runtime = yield* startMockApis({
          profile,
          workspace: "/workspace",
          sandbox: sandbox(() => "not json"),
        });
        return yield* runtime.collect();
      })
    );
    await expect(Effect.runPromise(evidence)).rejects.toThrow(
      "Invalid or missing API request evidence"
    );
    await expect(
      Effect.runPromise(
        Effect.scoped(
          startMockApis({
            profile,
            workspace: "/workspace",
            sandbox: sandbox(() => "", `${API_READY}{}\n`),
          })
        )
      )
    ).rejects.toThrow("Invalid API runtime evidence");
  });
});
