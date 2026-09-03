import { describe, expect, it } from "bun:test";
import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import { Effect, Redacted } from "effect";
import { CredentialError } from "../../src/credentials/errors";
import type { CredentialResolverShape } from "../../src/credentials/resolver";
import { resolveTaskCredentials } from "../../src/credentials/tasks";

const actor = Actor.make({
  id: UserId.make("user"),
  isUser: true,
  organizationId: OrganizationId.make("organization"),
  permissions: [],
});

const notFound = () =>
  Effect.fail(new CredentialError({ code: "not-found", message: "not found" }));

const missing: CredentialResolverShape = {
  resolve: notFound,
  resolveBound: notFound,
};

const envOnly: CredentialResolverShape = {
  ...missing,
  resolve: ({ connectionId, integrationId }) =>
    integrationId === "env"
      ? Effect.succeed(
          Redacted.make({
            authMethodId: "env",
            connectionId: connectionId ?? "env-default",
            integrationId,
            revision: 2,
            values: { OPENAI_API_KEY: "sk-1" },
          })
        )
      : notFound(),
};

const task = {
  harness: "opencode" as const,
  harnessVersion: "1",
  profile: null,
  model: "gpt-5.6-sol",
  provider: "daytona" as const,
};

describe("the env fallback", () => {
  it("finds an env connection when the harness has none", async () => {
    const [resolved] = await Effect.runPromise(
      resolveTaskCredentials(envOnly, actor, [task], "")
    );

    expect(Redacted.value(resolved.credentials.harness)).toMatchObject({
      connectionId: "env-default",
      integrationId: "env",
    });
    expect(resolved.bindings.harnessConnectionId).toBe("env-default");
  });

  it("follows an explicit binding to an env connection", async () => {
    const [resolved] = await Effect.runPromise(
      resolveTaskCredentials(
        envOnly,
        actor,
        [{ ...task, credentials: { harnessConnectionId: "shared-env" } }],
        ""
      )
    );

    expect(Redacted.value(resolved.credentials.harness)).toMatchObject({
      connectionId: "shared-env",
      integrationId: "env",
    });
  });

  it("reports a store failure instead of asking for env", async () => {
    const down: CredentialResolverShape = {
      ...missing,
      resolve: () =>
        Effect.fail(
          new CredentialError({ code: "internal", message: "store down" })
        ),
    };
    const failure = await Effect.runPromise(
      resolveTaskCredentials(
        down,
        actor,
        [{ ...task, credentials: { harnessConnectionId: "shared-env" } }],
        ""
      ).pipe(Effect.flip)
    );

    expect(failure.code).toBe("internal");
  });

  it("hands a keyless command harness an empty env credential", async () => {
    const [resolved] = await Effect.runPromise(
      resolveTaskCredentials(
        missing,
        actor,
        [{ ...task, harness: "command" as never }],
        ""
      )
    );

    expect(Redacted.value(resolved.credentials.harness)).toEqual({
      authMethodId: "env",
      connectionId: "env-none",
      integrationId: "env",
      revision: 0,
      values: {},
    });
    expect(resolved.bindings.harnessConnectionId).toBeUndefined();
  });
});
