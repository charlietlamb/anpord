import { HttpApiBuilder } from "@effect/platform";
import { OrganizationStore } from "@sphynx/auth/organization";
import { OrganizationMissing } from "@sphynx/auth/organization/errors";
import { CurrentActor } from "@sphynx/schema/internal/authentication";
import { PublicApi } from "@sphynx/schema/public/api";
import type { WhoamiCredential } from "@sphynx/schema/public/auth-api";
import { Effect, Option } from "effect";
import { withOrganizationErrors } from "../../../http/organization-errors";

const whoami = Effect.gen(function* () {
  const actor = yield* CurrentActor;
  const organizations = yield* OrganizationStore;
  const organization = yield* organizations.find(actor.organizationId);

  if (Option.isNone(organization)) {
    return yield* new OrganizationMissing({
      organizationId: actor.organizationId,
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
