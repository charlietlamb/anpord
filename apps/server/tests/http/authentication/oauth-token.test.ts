import { describe, expect, test } from "bun:test";
import type { AuthInstance } from "@anpord/auth";
import { Effect, Exit, Option } from "effect";
import { resolveOAuthToken } from "../../../src/http/authentication/oauth-token";

const authWith = (
  session: { scopes?: readonly string[]; userId: string } | null
) =>
  ({
    api: { getMcpSession: () => Promise.resolve(session) },
  }) as unknown as AuthInstance;

const org = (value: string | null) => () =>
  Effect.succeed(Option.fromNullable(value));

const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromiseExit(effect);

describe("resolveOAuthToken", () => {
  test("builds an actor from the token's user and their membership", async () => {
    const exit = await run(
      resolveOAuthToken(authWith({ userId: "user_1" }), "t", org("org_1"))
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(String(exit.value.id)).toBe("user_1");
      expect(String(exit.value.organizationId)).toBe("org_1");
    }
  });

  test("rejects a token with no session behind it", async () => {
    const exit = await run(
      resolveOAuthToken(authWith(null), "t", org("org_1"))
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });

  test("keeps approved eval scopes on the actor", async () => {
    const exit = await run(
      resolveOAuthToken(
        authWith({ scopes: ["evals:read", "evals:write"], userId: "user_1" }),
        "t",
        org("org_1")
      )
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.permissions).toEqual(["evals:read", "evals:write"]);
    }
  });

  test("rejects a user who belongs to no organization", async () => {
    const exit = await run(
      resolveOAuthToken(authWith({ userId: "user_1" }), "t", org(null))
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });

  test("fails rather than dies when the organization cannot be read", async () => {
    const exit = await run(
      resolveOAuthToken(authWith({ userId: "user_1" }), "t", () =>
        Effect.fail(new Error("database unavailable"))
      )
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).not.toContain("Die");
    }
  });
});
