import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import { InternalError, NotFound } from "../domain/errors";
import { Permission } from "../domain/permissions";
import { ApiKeyAuthentication } from "./authentication";
import { Repeatable } from "./repeatable";

const WhoamiRequest = Schema.Struct({}).annotations({
  description: "Describe the organization and credential behind this call.",
  identifier: "WhoamiRequest",
});

export const WhoamiCredential = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("apiKey"),
    name: Schema.NullOr(Schema.String),
    start: Schema.NullOr(Schema.String),
  }),
  Schema.Struct({ kind: Schema.Literal("oauth") })
).annotations({
  description:
    "The credential that authenticated the call. For an API key, its name and its first characters, never the secret.",
  identifier: "WhoamiCredential",
});
export type WhoamiCredential = typeof WhoamiCredential.Type;

export const WhoamiOrganization = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  slug: Schema.String,
});
export type WhoamiOrganization = typeof WhoamiOrganization.Type;

export const Whoami = Schema.Struct({
  credential: WhoamiCredential,
  organization: WhoamiOrganization,
  permissions: Schema.Array(Permission),
}).annotations({
  description:
    "The organization every call with this credential acts for, and what the credential may do there.",
  identifier: "Whoami",
});
export type Whoami = typeof Whoami.Type;

export class AuthGroup extends HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.post("whoami", "/auth.whoami")
      .annotate(Repeatable, true)
      .setPayload(WhoamiRequest)
      .addSuccess(Whoami)
      .annotate(OpenApi.Summary, "Show which organization a credential uses")
      .annotate(
        OpenApi.Description,
        "Runs, suites, and connectors started with this credential land in this organization."
      )
  )
  .middleware(ApiKeyAuthentication)
  .addError(NotFound)
  .addError(InternalError)
  .annotate(OpenApi.Title, "Auth")
  .annotate(
    OpenApi.Description,
    "Check the credential a client is using before it starts work."
  ) {}
