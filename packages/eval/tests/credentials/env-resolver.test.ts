import { describe, expect, it } from "bun:test";
import { ConfigProvider, Effect, Either, Option, Redacted } from "effect";
import { credentialResolverFrom } from "../../src/credentials/env-resolver";
import { modelAccessFor } from "../../src/credentials/model-key";
import { CredentialResolver } from "../../src/credentials/resolver";
import { systemActor } from "../../src/credentials/system-actor";

const leased = credentialResolverFrom(
  new Map<string, Readonly<Record<string, string>>>([
    ["codex", { OPENAI_API_KEY: "sk-lent" }],
    ["claude", { ANTHROPIC_API_KEY: "sk-ant-lent" }],
  ])
);

const resolving = (integrationId: string) =>
  Effect.runPromise(
    Effect.flatMap(CredentialResolver, (credentials) =>
      credentials.resolve({ actor: systemActor("org"), integrationId })
    ).pipe(
      Effect.map((found) => Redacted.value(found).values),
      Effect.mapError((error) => error.message),
      Effect.either,
      Effect.provide(leased)
    )
  );

describe("credentials lent to a local run", () => {
  it("answers each harness the run leased, with its own values", async () => {
    expect([await resolving("codex"), await resolving("claude")]).toEqual([
      Either.right({ OPENAI_API_KEY: "sk-lent" }),
      Either.right({ ANTHROPIC_API_KEY: "sk-ant-lent" }),
    ]);
  });

  it("answers a harness that needs no key with no values, as a hosted run does", async () => {
    expect(await resolving("command")).toEqual(Either.right({}));
  });

  it("refuses any integration it holds no lease for", async () => {
    expect(await resolving("opencode")).toEqual(
      Either.left(
        "this run holds credentials for codex, claude, not one for opencode"
      )
    );
  });

  it("is never used as a model key for the simulated user", async () => {
    const access = await Effect.runPromise(
      Effect.flatMap(CredentialResolver, (credentials) =>
        modelAccessFor(credentials, "org", "openai")
      ).pipe(
        Effect.provide(leased),
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    );

    expect(Option.isNone(access)).toBe(true);
  });
});
