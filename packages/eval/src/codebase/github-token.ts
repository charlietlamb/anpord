import { Database } from "@anpord/db/client";
import { account } from "@anpord/db/schema/auth/accounts";
import type { Actor } from "@anpord/schema/domain/actor";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option, Redacted } from "effect";
import { tryStore } from "../repositories/query";
import { CodebaseError } from "./errors";

/** The scope a private clone needs. GitHub has no narrower read-only grant. */
export const REPO_SCOPE = "repo";

/** GitHub returns scopes comma-separated; other providers use spaces. */
const SCOPE_SEPARATOR = /[,\s]+/;

export interface GithubToken {
  readonly scopes: readonly string[];
  readonly value: Redacted.Redacted<string>;
}

export interface GithubTokensShape {
  /** None where the member has never signed in with GitHub, or signed in
   * before the token was stored. */
  readonly forActor: (
    actor: Actor
  ) => Effect.Effect<Option.Option<GithubToken>, CodebaseError>;
}

export class GithubTokens extends Context.Tag("@anpord/eval/GithubTokens")<
  GithubTokens,
  GithubTokensShape
>() {}

const parseScopes = (scope: string | null) =>
  scope === null
    ? []
    : scope
        .split(SCOPE_SEPARATOR)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

export const GithubTokensLive = Layer.effect(
  GithubTokens,
  Effect.gen(function* () {
    const db = yield* Database;

    return GithubTokens.of({
      forActor: (actor) =>
        Effect.gen(function* () {
          /* An API key acts for an organization rather than a person, and a
             GitHub token belongs to a person, so there is nothing to find. */
          if (!actor.isUser) {
            return Option.none<GithubToken>();
          }

          const rows = yield* tryStore("codebase.token", () =>
            db
              .select({
                accessToken: account.accessToken,
                scope: account.scope,
              })
              .from(account)
              .where(
                and(
                  eq(account.userId, actor.id),
                  eq(account.providerId, "github")
                )
              )
              .limit(1)
          ).pipe(
            Effect.mapError(
              (cause) =>
                new CodebaseError({
                  cause,
                  message: "Could not read the GitHub connection",
                })
            )
          );

          const row = rows[0];

          return row?.accessToken
            ? Option.some({
                scopes: parseScopes(row.scope),
                value: Redacted.make(row.accessToken),
              })
            : Option.none<GithubToken>();
        }).pipe(
          Effect.withSpan("GithubTokens.forActor"),
          Effect.annotateLogs({
            organizationId: actor.organizationId,
            userId: actor.id,
          })
        ),
    });
  })
);
