import { Database } from "@anpord/db/client";
import { verification } from "@anpord/db/schema/auth/verifications";
import { credentialAuthAttempt } from "@anpord/db/schema/credentials/auth-attempts";
import { lt } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "./query";

export interface ExpiredRowsShape {
  /* Two tables in one repository because they share one rule: a row past its
     expiry is dead, and one sweep buries both. */
  readonly deleteBefore: (
    cutoff: Date
  ) => Effect.Effect<
    { readonly attempts: number; readonly verifications: number },
    EvalStoreError
  >;
}

export class ExpiredRows extends Context.Tag("@anpord/eval/ExpiredRows")<
  ExpiredRows,
  ExpiredRowsShape
>() {}

export const ExpiredRowsLive = Layer.effect(
  ExpiredRows,
  Effect.gen(function* () {
    const db = yield* Database;

    return ExpiredRows.of({
      deleteBefore: (cutoff) =>
        Effect.gen(function* () {
          const attempts = yield* tryStore("expired.attempts", () =>
            db
              .delete(credentialAuthAttempt)
              .where(lt(credentialAuthAttempt.expiresAt, cutoff))
              .returning({ id: credentialAuthAttempt.id })
          );
          const verifications = yield* tryStore("expired.verifications", () =>
            db
              .delete(verification)
              .where(lt(verification.expiresAt, cutoff))
              .returning({ id: verification.id })
          );

          return {
            attempts: attempts.length,
            verifications: verifications.length,
          };
        }).pipe(Effect.withSpan("ExpiredRows.deleteBefore")),
    });
  })
);
