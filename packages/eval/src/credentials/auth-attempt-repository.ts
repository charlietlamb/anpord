import { Database } from "@anpord/db/client";
import { credentialAuthAttempt } from "@anpord/db/schema/credentials/auth-attempts";
import type { Actor } from "@anpord/schema/domain/actor";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { head, tryStore } from "../repositories/query";
import { CredentialError, storeUnavailable } from "./errors";

type AttemptRow = typeof credentialAuthAttempt.$inferSelect;

type NewAttempt = typeof credentialAuthAttempt.$inferInsert;

export interface CredentialAuthAttemptRepositoryShape {
  readonly create: (row: NewAttempt) => Effect.Effect<void, CredentialError>;
  readonly find: (
    actor: Actor,
    id: string
  ) => Effect.Effect<AttemptRow, CredentialError>;
  readonly finish: (
    id: string,
    values: Partial<NewAttempt>
  ) => Effect.Effect<void, CredentialError>;
}

export class CredentialAuthAttemptRepository extends Context.Tag(
  "@anpord/eval/CredentialAuthAttemptRepository"
)<CredentialAuthAttemptRepository, CredentialAuthAttemptRepositoryShape>() {}

const attemptNotFound = () =>
  new CredentialError({
    code: "not-found",
    message: "Login attempt not found",
  });

const stored = <A>(method: string, run: () => Promise<A>) =>
  tryStore(`CredentialAuthAttemptRepository.${method}`, run).pipe(
    Effect.mapError(storeUnavailable),
    Effect.withSpan(`CredentialAuthAttemptRepository.${method}`)
  );

export const CredentialAuthAttemptRepositoryLive = Layer.effect(
  CredentialAuthAttemptRepository,
  Effect.gen(function* () {
    const db = yield* Database;

    return CredentialAuthAttemptRepository.of({
      create: (row) =>
        stored("create", () =>
          db.insert(credentialAuthAttempt).values(row)
        ).pipe(Effect.asVoid),
      find: (actor, id) =>
        stored("find", () =>
          db
            .select()
            .from(credentialAuthAttempt)
            .where(
              and(
                eq(credentialAuthAttempt.id, id),
                eq(credentialAuthAttempt.organizationId, actor.organizationId),
                eq(credentialAuthAttempt.userId, actor.id)
              )
            )
            .limit(1)
        ).pipe(
          Effect.flatMap((rows) => Effect.mapError(head(rows), attemptNotFound))
        ),
      finish: (id, values) =>
        stored("finish", () =>
          db
            .update(credentialAuthAttempt)
            .set(values)
            .where(eq(credentialAuthAttempt.id, id))
        ).pipe(Effect.asVoid),
    });
  })
);
