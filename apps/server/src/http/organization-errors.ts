import type { OrganizationStoreError } from "@anpord/auth/organization/errors";
import { InternalError, type NotFound } from "@anpord/schema/domain/errors";
import { Effect } from "effect";

const unreadable = (error: OrganizationStoreError) =>
  Effect.logError("Organization read failed", error).pipe(
    Effect.zipRight(
      Effect.fail(
        new InternalError({
          message:
            "Unable to read this credential's organization. Try again in a moment.",
        })
      )
    )
  );

export const withOrganizationErrors = <A, R>(
  effect: Effect.Effect<A, NotFound | OrganizationStoreError, R>
) => Effect.catchTag(effect, "OrganizationStoreError", unreadable);
