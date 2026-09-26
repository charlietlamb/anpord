import { OrganizationStore } from "@anpord/auth/organization";
import { NotFound } from "@anpord/schema/domain/errors";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { PublicApi } from "@anpord/schema/public/api";
import type { WhoamiCredential } from "@anpord/schema/public/auth-api";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Option } from "effect";
import { withOrganizationErrors } from "../../../http/organization-errors";

const whoami = Effect.gen(function* () {
  const actor = yield* CurrentActor;
  const organizations = yield* OrganizationStore;
  const organization = yield* organizations.find(actor.organizationId);

  if (Option.isNone(organization)) {
    return yield* new NotFound({
      message: "This credential's organization no longer exists.",
    });
  }

  const credential: WhoamiCredential =
    actor.apiKey === undefined
      ? { kind: "oauth" }
      : { kind: "apiKey", ...actor.apiKey };

  return {
    credential,
    organization: organization.value,
    permissions: actor.permissions,
  };
}).pipe(withOrganizationErrors, Effect.withSpan("Auth.whoami"));

export const AuthHandlers = HttpApiBuilder.group(
  PublicApi,
  "auth",
  (handlers) => handlers.handle("whoami", () => whoami)
);
