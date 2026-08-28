import { Database } from "@anpord/db/client";
import { githubInstallation } from "@anpord/db/schema/credentials/installations";
import type { Actor } from "@anpord/schema/domain/actor";
import { eq } from "drizzle-orm";
import { Clock, Context, Effect, Layer, Option } from "effect";
import { tryStore } from "../repositories/query";
import { CodebaseError } from "./errors";

export interface Installation {
  readonly accountLogin: string;
  readonly id: number;
  readonly repositorySelection: string;
}

export interface RecordInstallation {
  readonly accountLogin: string;
  readonly id: number;
  readonly repositorySelection: string;
}

export interface InstallationsShape {
  readonly forOrganization: (
    actor: Actor
  ) => Effect.Effect<Option.Option<Installation>, CodebaseError>;
  readonly record: (
    actor: Actor,
    input: RecordInstallation
  ) => Effect.Effect<void, CodebaseError>;
  readonly remove: (actor: Actor) => Effect.Effect<void, CodebaseError>;
}

export class Installations extends Context.Tag("@anpord/eval/Installations")<
  Installations,
  InstallationsShape
>() {}

const unavailable = (cause: unknown) =>
  new CodebaseError({ cause, message: "Could not read the GitHub connection" });

export const InstallationsLive = Layer.effect(
  Installations,
  Effect.gen(function* () {
    const db = yield* Database;

    return Installations.of({
      forOrganization: (actor) =>
        tryStore("codebase.installation", () =>
          db
            .select({
              accountLogin: githubInstallation.accountLogin,
              id: githubInstallation.id,
              repositorySelection: githubInstallation.repositorySelection,
            })
            .from(githubInstallation)
            .where(eq(githubInstallation.organizationId, actor.organizationId))
            .limit(1)
        ).pipe(
          Effect.mapError(unavailable),
          Effect.map((rows) => Option.fromNullable(rows[0])),
          Effect.withSpan("Installations.forOrganization"),
          Effect.annotateLogs({ organizationId: actor.organizationId })
        ),

      record: (actor, input) =>
        Effect.gen(function* () {
          const now = new Date(yield* Clock.currentTimeMillis);

          /* Upsert on GitHub's id: reinstalling the app on the same account
             returns the same installation, and a second row for it would
             leave the organization with two answers to which one clones. */
          yield* tryStore("codebase.installation.record", () =>
            db
              .insert(githubInstallation)
              .values({
                accountLogin: input.accountLogin,
                createdAt: now,
                id: input.id,
                installedByUserId: actor.isUser ? actor.id : null,
                organizationId: actor.organizationId,
                repositorySelection: input.repositorySelection,
                updatedAt: now,
              })
              .onConflictDoUpdate({
                set: {
                  accountLogin: input.accountLogin,
                  organizationId: actor.organizationId,
                  repositorySelection: input.repositorySelection,
                  updatedAt: now,
                },
                target: githubInstallation.id,
              })
          ).pipe(Effect.mapError(unavailable));
        }).pipe(
          Effect.withSpan("Installations.record"),
          Effect.annotateLogs({
            installationId: input.id,
            organizationId: actor.organizationId,
          })
        ),

      remove: (actor) =>
        tryStore("codebase.installation.remove", () =>
          db
            .delete(githubInstallation)
            .where(eq(githubInstallation.organizationId, actor.organizationId))
        ).pipe(
          Effect.asVoid,
          Effect.mapError(unavailable),
          Effect.withSpan("Installations.remove"),
          Effect.annotateLogs({ organizationId: actor.organizationId })
        ),
    });
  })
);
