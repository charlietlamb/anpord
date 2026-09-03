import { Database } from "@anpord/db/client";
import { credentialAuthAttempt } from "@anpord/db/schema/credentials/auth-attempts";
import type { Actor } from "@anpord/schema/domain/actor";
import { and, eq } from "drizzle-orm";
import { Clock, Context, Effect, Layer } from "effect";
import { tryStore } from "../repositories/query";
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

export const CredentialAuthAttemptRepositoryLive = Layer.effect(
  CredentialAuthAttemptRepository,
  Effect.gen(function* () {
    const db = yield* Database;

    const update = (id: string, values: Partial<NewAttempt>) =>
      tryStore("credential.device.update", () =>
        db
          .update(credentialAuthAttempt)
          .set(values)
          .where(eq(credentialAuthAttempt.id, id))
      ).pipe(Effect.asVoid, Effect.mapError(storeUnavailable));

    return CredentialAuthAttemptRepository.of({
      create: (row) =>
        tryStore("credential.device.create", () =>
          db.insert(credentialAuthAttempt).values(row)
        ).pipe(Effect.asVoid, Effect.mapError(storeUnavailable)),
      find: (actor, id) =>
        tryStore("credential.device.status", () =>
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
          Effect.mapError(storeUnavailable),
          Effect.flatMap((rows) =>
            rows[0] === undefined
              ? Effect.fail(attemptNotFound())
              : Effect.succeed(rows[0])
          )
        ),
      finish: (id, values) =>
        Clock.currentTimeMillis.pipe(
          Effect.flatMap((now) =>
            update(id, { ...values, completedAt: new Date(now) })
          )
        ),
    });
  })
);
