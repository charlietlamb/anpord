import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import {
  CredentialConnection,
  CredentialIntegration,
  CredentialScope,
  CredentialValues,
} from "../domain/credentials";
import { BadRequest, Forbidden, NotFound } from "../domain/errors";
import { ApiKeyAuthentication } from "./authentication";

const ListConnectorsRequest = Schema.Struct({}).annotations({
  description: "List the connectors this organization has.",
  identifier: "ListConnectorsRequest",
});

const AddConnectorRequest = Schema.Struct({
  authMethodId: Schema.String.pipe(Schema.minLength(1)),
  integrationId: Schema.String.pipe(Schema.minLength(1)),
  isDefault: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  scope: Schema.optionalWith(CredentialScope, {
    default: () => "organization" as const,
  }),
  values: CredentialValues,
}).annotations({
  description:
    "Connect an integration. The values are encrypted on arrival and never read back.",
  identifier: "AddConnectorRequest",
});

const RemoveConnectorRequest = Schema.Struct({
  id: Schema.String.pipe(Schema.minLength(1)),
}).annotations({
  description: "Remove a connector by its id.",
  identifier: "RemoveConnectorRequest",
});

export class PublicConnectorsGroup extends HttpApiGroup.make("connectors")
  .add(
    HttpApiEndpoint.post("integrations", "/connectors.integrations")
      .setPayload(ListConnectorsRequest)
      .addSuccess(Schema.Array(CredentialIntegration))
      .annotate(OpenApi.Summary, "List the integrations that can be connected")
      .annotate(
        OpenApi.Description,
        "Each integration states the auth methods it accepts and the fields each one needs."
      )
  )
  .add(
    HttpApiEndpoint.post("list", "/connectors.list")
      .setPayload(ListConnectorsRequest)
      .addSuccess(Schema.Array(CredentialConnection))
      .annotate(OpenApi.Summary, "List connected integrations")
      .annotate(
        OpenApi.Description,
        "The stored secret is never returned, only that a connection exists."
      )
  )
  .add(
    HttpApiEndpoint.post("add", "/connectors.add")
      .setPayload(AddConnectorRequest)
      .addSuccess(CredentialConnection)
      .annotate(OpenApi.Summary, "Connect an integration")
      .annotate(
        OpenApi.Description,
        "Values are encrypted on arrival. The response states the connection without them."
      )
  )
  .add(
    HttpApiEndpoint.post("remove", "/connectors.remove")
      .setPayload(RemoveConnectorRequest)
      .addSuccess(Schema.Void)
      .annotate(OpenApi.Summary, "Remove a connector")
  )
  .middleware(ApiKeyAuthentication)
  .addError(BadRequest)
  .addError(Forbidden)
  .addError(NotFound)
  .annotate(OpenApi.Title, "Connectors")
  .annotate(
    OpenApi.Description,
    "Connect the credentials an eval run needs: a harness to drive, a sandbox to run in, and a model to play a case's human."
  ) {}
