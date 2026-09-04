import { describe, expect, it } from "bun:test";
import { Effect, Either } from "effect";
import { credentialIntegrations } from "../../src/credentials/integrations";
import { validateCredential } from "../../src/credentials/validate-credential";

describe("credential integrations", () => {
  it("rejects missing required fields", async () => {
    const result = await Effect.runPromise(
      Effect.either(validateCredential("modal", "token", { tokenId: "id" }))
    );
    expect(result._tag).toBe("Left");
  });

  it("stores only declared fields", async () => {
    const result = await Effect.runPromise(
      validateCredential("daytona", "api-key", {
        apiKey: "key",
        ignored: "value",
      })
    );
    expect(result).toEqual({ apiKey: "key" });
  });

  it("declares every supported harness and hosted sandbox", () => {
    expect(credentialIntegrations.map(({ id }) => id)).toEqual([
      "codex",
      "opencode",
      "pi",
      "fx",
      "claude",
      "gemini",
      "qwen",
      "cursor",
      "env",
      "command",
      "daytona",
      "e2b",
      "upstash",
      "modal",
      "cloudflare",
      "vercel",
    ]);
  });

  it.each([
    ["daytona", "api-key", { apiKey: "key" }],
    ["e2b", "api-key", { apiKey: "key" }],
    ["upstash", "api-key", { apiKey: "key" }],
    ["modal", "token", { tokenId: "id", tokenSecret: "secret" }],
    ["cloudflare", "api-token", { apiToken: "token" }],
    [
      "vercel",
      "token",
      { projectId: "project", teamId: "team", token: "token" },
    ],
  ] as const)("validates %s credentials", async (integration, method, values) => {
    expect(
      await Effect.runPromise(validateCredential(integration, method, values))
    ).toEqual(values);
  });

  it("rejects an empty device credential", async () => {
    const result = await Effect.runPromise(
      Effect.either(validateCredential("codex", "chatgpt", {}))
    );
    expect(result._tag).toBe("Left");
  });

  describe("the env method", () => {
    const env = (values: Readonly<Record<string, string>>) =>
      Effect.runPromise(
        Effect.either(validateCredential("env", "env", values))
      );

    it("keeps every variable the customer names", async () => {
      expect(
        Either.getOrThrow(
          await env({ ANTHROPIC_API_KEY: " sk-ant ", OPENAI_API_KEY: "sk-1" })
        )
      ).toEqual({ ANTHROPIC_API_KEY: "sk-ant", OPENAI_API_KEY: "sk-1" });
    });

    it.each([
      ["a lower case name", { lower_case: "value" }],
      ["a name starting with a digit", { "1KEY": "value" }],
      ["an empty map", {}],
      ["an empty value", { API_KEY: "  " }],
    ])("rejects %s", async (_, values) => {
      expect((await env(values))._tag).toBe("Left");
    });
  });
});
