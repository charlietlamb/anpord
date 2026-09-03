import { describe, expect, it } from "bun:test";
import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Effect, Either, Redacted, Stream } from "effect";
import { ClaudeDriver } from "../../../src/adapters/harness/claude";
import { CodexDriver } from "../../../src/adapters/harness/codex";
import { OpencodeDriver } from "../../../src/adapters/harness/opencode";
import { PiDriver } from "../../../src/adapters/harness/pi";
import type { HarnessDriverShape } from "../../../src/ports/harness";
import type { ExecChunk, SandboxHandle } from "../../../src/ports/sandbox";
import { notResumableFixture } from "../../fixtures/not-resumable";

const HOME = "/home/agent";

const recording = () => {
  const steps: string[] = [];
  const sandbox: SandboxHandle = {
    exec: (command) => {
      steps.push(`exec ${command}`);

      return Stream.fromIterable<ExecChunk>([
        { at: 0, exitCode: 0, stream: "exit" },
      ]);
    },
    home: HOME,
    id: "test",
    provider: "daytona",
    ...notResumableFixture,
    streaming: false,
    writeFile: (path) =>
      Effect.sync(() => {
        steps.push(`write ${path}`);
      }),
  };

  return { sandbox, steps };
};

const envCredential = (
  values: Readonly<Record<string, string>>
): ResolvedCredential => ({
  authMethodId: "env",
  connectionId: "env-1",
  integrationId: "env",
  revision: 1,
  values,
});

const prepare = (
  driver: HarnessDriverShape,
  credential: ResolvedCredential
) => {
  const { sandbox, steps } = recording();

  return Effect.runPromise(
    driver
      .prepare({
        credential: Redacted.make(credential),
        home: HOME,
        sandbox,
        version: "1.0.0",
      })
      .pipe(Effect.either)
  ).then((result) => ({ result, steps }));
};

describe("an env credential at a driver", () => {
  it("lets OpenCode install with no auth file", async () => {
    const { result, steps } = await prepare(
      OpencodeDriver,
      envCredential({ OPENAI_API_KEY: "sk-1" })
    );

    expect(Either.getOrThrow(result)).toEqual({
      OPENCODE_DISABLE_MODELS_FETCH: "1",
    });
    expect(steps.some((step) => step.includes("opencode.ai/install"))).toBe(
      true
    );
  });

  it("hands Claude the ANTHROPIC_API_KEY it carries", async () => {
    const { result } = await prepare(
      ClaudeDriver,
      envCredential({ ANTHROPIC_API_KEY: "sk-ant" })
    );

    expect(Either.getOrThrow(result)).toEqual({
      ANTHROPIC_API_KEY: "sk-ant",
      IS_SANDBOX: "1",
    });
  });

  it("refuses Claude a map without that key", async () => {
    const { result } = await prepare(
      ClaudeDriver,
      envCredential({ OPENAI_API_KEY: "sk-1" })
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left.reason).toContain("ANTHROPIC_API_KEY");
    }
  });

  it.each([
    ["Codex", CodexDriver, "auth.json"],
    ["Pi", PiDriver, "authJson"],
  ])("keeps %s on its own material", async (_, driver, named) => {
    const { result, steps } = await prepare(
      driver,
      envCredential({ OPENAI_API_KEY: "sk-1" })
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("HarnessUnavailable");
      expect(result.left.reason).toContain(named);
    }
    expect(steps).toEqual([]);
  });

  it("still refuses a credential for another harness", async () => {
    const { result } = await prepare(ClaudeDriver, {
      ...envCredential({ apiKey: "sk-1" }),
      integrationId: "codex",
    });

    expect(result._tag).toBe("Left");
  });
});
