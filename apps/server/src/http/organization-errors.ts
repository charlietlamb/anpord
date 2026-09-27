import type {
  OrganizationMissing,
  OrganizationStoreError,
} from "@anpord/auth/organization/errors";
import { InternalError, NotFound } from "@anpord/schema/domain/errors";
import { Effect } from "effect";

type OrganizationDomainError = OrganizationMissing | OrganizationStoreError;

const toHttpError = (
  error: OrganizationDomainError
): Effect.Effect<never, NotFound | InternalError> => {
  switch (error._tag) {
    case "OrganizationMissing":
      return Effect.fail(
        new NotFound({
          message: "This credential's organization no longer exists.",
        })
      );
    case "OrganizationStoreError":
      return Effect.logError("Organization read failed", error).pipe(
        Effect.zipRight(
          Effect.fail(
            new InternalError({
              message:
                "Unable to read this credential's organization. Try again in a moment.",
            })
          )
        )
      );
    default:
      return error satisfies never;
  }
};

export const withOrganizationErrors = <A, R>(
  effect: Effect.Effect<A, OrganizationDomainError, R>
) => Effect.catchAll(effect, toHttpError);
