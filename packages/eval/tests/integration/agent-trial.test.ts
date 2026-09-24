import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect, Layer, Option } from "effect";
import { HarnessesLive } from "../../src/adapters/harness/resolve";
import { ScorerGroundTruthLive } from "../../src/adapters/scorers/ground-truth";
import { layerTestResolver } from "../../src/credentials/layer-test-resolver";
import type { RequestedProfile } from "../../src/domain/harness-profile";
import { EvalSandboxLive } from "../../src/layer";
import { SimulatedUserSilent } from "../../src/ports/simulated-user";
import { AgentTrial, AgentTrialLive } from "../../src/services/agent-trial";
import { SuspenderSleeping } from "../../src/services/suspender";
import {
  AGENT_PROMPT,
  brokenSource,
  VERIFY_COMMAND,
} from "../fixtures/broken-task";
import {
  codexCredential,
  emptyEnvCredential,
  hasCloudflare,
  hasCodex,
  hasDaytona,
  hasE2b,
  hasModal,
  hasUpstash,
  hasVercel,
} from "../fixtures/credentials";

const TestLayer = AgentTrialLive.pipe(
  Layer.provide(layerTestResolver()),
  Layer.provide(HarnessesLive),
  Layer.provide(SuspenderSleeping),
  Layer.provide(ScorerGroundTruthLive),
  Layer.provide(SimulatedUserSilent),
  Layer.provideMerge(EvalSandboxLive)
);
for (const [provider, ready] of [
  ["daytona", hasDaytona && hasCodex],
  ["upstash", hasUpstash && hasCodex],
  ["modal", hasModal && hasCodex],
  ["cloudflare", hasCloudflare && hasCodex],
  ["vercel", hasVercel && hasCodex],
] as const) {
  describe.skipIf(!ready)(`an agent trial against ${provider}`, () => {
    it("lets Codex fix a broken task and scores it from ground truth", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const trial = yield* AgentTrial;
          return yield* trial.run({
            autoStopMinutes: 15,
            harness: "codex",
            harnessCredential: codexCredential,
            harnessVersion: "0.144.4",
            organizationId: "org_test",
            model: "gpt-5.6-sol",
            prompt: AGENT_PROMPT,
            profile: null,
            provider,
            prepare: null,
            source: brokenSource,
            verifyCommand: VERIFY_COMMAND,
            workspace: "/tmp/anpord-task",
          });
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result.outcome.status).toBe("passed");
      expect(result.outcome.voidFields).toEqual([]);
      expect(result.commands).toBeGreaterThan(0);
      expect(result.filesChanged.length).toBeGreaterThan(0);
      expect(Option.isSome(result.usage)).toBe(true);
      expect(result.outcome.modelMs).toBeGreaterThan(0);
      expect(result.outcome.sandboxMs).toBeGreaterThan(0);
    }, 900_000);
  });
}

const commandProfile = (script: string): RequestedProfile => ({
  env: null,
  files: {},
  install: null,
  name: "sample",
  run: readFileSync(join(import.meta.dir, "../fixtures", script), "utf8"),
  systemPrompt: null,
});

const NOTE = "append this line to notes.txt";

describe.skipIf(!hasE2b)("a command trial against e2b", () => {
  const trial = (script: string) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const runner = yield* AgentTrial;
        return yield* runner.run({
          autoStopMinutes: 15,
          harness: "command",
          harnessCredential: emptyEnvCredential,
          harnessVersion: "profile",
          model: "sample/model",
          organizationId: "org_test",
          prepare: null,
          profile: commandProfile(script),
          prompt: NOTE,
          provider: "e2b",
          source: { files: {}, kind: "files" },
          verifyCommand: `grep -q -F ${JSON.stringify(NOTE)} notes.txt`,
          workspace: "/tmp/anpord-command",
        });
      }).pipe(Effect.provide(TestLayer))
    );

  it("scores the reference agent from the file it wrote", async () => {
    const result = await trial("command-agent.sh");

    expect(result.outcome.status).toBe("passed");
    expect(result.outcome.voidFields).toEqual([]);
    expect(result.filesChanged.length).toBeGreaterThan(0);
    expect(Option.isSome(result.usage)).toBe(true);
    expect(
      result.events.filter(
        (event) => event._tag === "Command" && event.exitCode === null
      ).length
    ).toBeGreaterThan(0);
  }, 900_000);

  it("fails the same verifier for an agent that only says it is done", async () => {
    const result = await trial("command-agent-lying.sh");

    expect(result.outcome.status).not.toBe("passed");
    expect(result.events.some((event) => event._tag === "Finished")).toBe(true);
  }, 900_000);
});
