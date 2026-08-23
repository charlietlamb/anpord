import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  credentialIntegrations,
  validateCredential,
} from "../../src/credentials/integrations";

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
});
