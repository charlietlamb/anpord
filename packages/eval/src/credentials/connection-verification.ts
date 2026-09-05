import type { Actor } from "@anpord/schema/domain/actor";
import { Clock, Effect, Either, Redacted } from "effect";
import type { CredentialCipherShape } from "./cipher";
import { openValues } from "./connection-payload";
import type { CredentialConnectionRepositoryShape } from "./connection-repository";
import { summaryOf } from "./connection-row";
import { validateCredential } from "./validate-credential";

export const verifyConnection =
  (
    cipher: CredentialCipherShape,
    repository: CredentialConnectionRepositoryShape
  ) =>
  (actor: Actor, id: string) =>
    Effect.gen(function* () {
      const selected = yield* repository.find(actor, id);
      const checked = yield* openValues(cipher, selected).pipe(
        Effect.flatMap((values) =>
          validateCredential(
            selected.integrationId,
            selected.authMethodId,
            Redacted.value(values)
          )
        ),
        Effect.either
      );
      const now = new Date(yield* Clock.currentTimeMillis);
      const row = yield* repository.recordVerification(
        actor,
        selected.id,
        Either.isRight(checked),
        now
      );

      if (Either.isLeft(checked)) {
        return yield* Effect.fail(checked.left);
      }

      return summaryOf(row);
    }).pipe(
      Effect.withSpan("CredentialConnections.verify"),
      Effect.annotateLogs({
        credentialId: id,
        organizationId: actor.organizationId,
      })
    );
