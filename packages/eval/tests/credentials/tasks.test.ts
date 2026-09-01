import { describe, expect, it } from "bun:test";
import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import { Effect, Redacted } from "effect";
import type { CredentialResolverShape } from "../../src/credentials/connections";
import { CredentialError } from "../../src/credentials/errors";
import { resolveTaskCredentials } from "../../src/credentials/tasks";

const actor = Actor.make({
  id: UserId.make("user"),
  isUser: true,
  organizationId: OrganizationId.make("organization"),
  permissions: [],
});

const missing: CredentialResolverShape = {
  resolve: () =>
    Effect.fail(
      new CredentialError({ code: "not-found", message: "not found" })
    ),
  resolveBound: () =>
    Effect.fail(
      new CredentialError({ code: "not-found", message: "not used here" })
    ),
};

const task = {
  harness: "codex" as const,
  harnessVersion: "1",
  model: "gpt-5.6-sol",
  provider: "daytona" as const,
};

describe("task credentials", () => {
  it("keeps the legacy fallback only for Codex", async () => {
    const [resolved] = await Effect.runPromise(
      resolveTaskCredentials(missing, actor, [task], '{"tokens":{}}')
    );

    expect(Redacted.value(resolved.credentials.harness)).toMatchObject({
      integrationId: "codex",
      revision: 0,
      values: { authJson: '{"tokens":{}}' },
    });

    const failure = await Effect.runPromise(
      resolveTaskCredentials(
        missing,
        actor,
        [{ ...task, harness: "claude" }],
        '{"tokens":{}}'
      ).pipe(Effect.flip)
    );

    expect(failure.message).toBe("No credential configured for claude");
  });

  it("preserves explicit bindings and revisions", async () => {
    const resolver: CredentialResolverShape = {
      resolveBound: () =>
        Effect.fail(
          new CredentialError({ code: "not-found", message: "not used here" })
        ),
      resolve: ({ connectionId, integrationId }) =>
        Effect.succeed(
          Redacted.make({
            authMethodId: "api-key",
            connectionId: connectionId ?? "default",
            integrationId,
            revision: 4,
            values: { apiKey: "secret" },
          })
        ),
    };
    const [resolved] = await Effect.runPromise(
      resolveTaskCredentials(
        resolver,
        actor,
        [
          {
            ...task,
            credentials: {
              harnessConnectionId: "harness",
              sandboxConnectionId: "sandbox",
            },
            provider: "daytona",
          },
        ],
        ""
      )
    );

    expect(resolved.bindings).toEqual({
      harnessConnectionId: "harness",
      sandboxConnectionId: "sandbox",
    });
    expect(Redacted.value(resolved.credentials.harness)).toMatchObject({
      connectionId: "harness",
      revision: 4,
    });
    if (resolved.credentials.sandbox === undefined) {
      throw new Error("Expected sandbox credentials");
    }
    expect(Redacted.value(resolved.credentials.sandbox)).toMatchObject({
      connectionId: "sandbox",
      revision: 4,
    });
  });

  it("does not hide an invalid explicit binding", async () => {
    const failure = await Effect.runPromise(
      resolveTaskCredentials(
        missing,
        actor,
        [
          {
            ...task,
            credentials: { harnessConnectionId: "removed" },
          },
        ],
        '{"tokens":{}}'
      ).pipe(Effect.flip)
    );

    expect(failure.code).toBe("not-found");
  });
});
