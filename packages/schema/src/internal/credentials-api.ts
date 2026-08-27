import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import {
  CreateCredentialConnection,
  CredentialConnection,
  CredentialIntegration,
  DeviceAuthChallenge,
  DeviceAuthStatus,
  IntegrationAwareness,
  RotateCredentialConnection,
  StartDeviceAuth,
} from "../domain/credentials";
import {
  BadRequest,
  Forbidden,
  InternalError,
  NotFound,
} from "../domain/errors";
import { Authentication } from "./authentication";

const ConnectionPath = Schema.Struct({ id: Schema.String });
const AttemptPath = Schema.Struct({ id: Schema.String });

export class CredentialsGroup extends HttpApiGroup.make("credentials")
  .add(
    HttpApiEndpoint.get(
      "integrations",
      "/evals/credentials/integrations"
    ).addSuccess(Schema.Array(CredentialIntegration))
  )
  .add(
    HttpApiEndpoint.get("list", "/evals/credentials/connections").addSuccess(
      Schema.Array(CredentialConnection)
    )
  )
  .add(
    HttpApiEndpoint.get("awareness", "/evals/credentials/awareness").addSuccess(
      Schema.Array(IntegrationAwareness)
    )
  )
  .add(
    HttpApiEndpoint.post("create", "/evals/credentials/connections")
      .setPayload(CreateCredentialConnection)
      .addSuccess(CredentialConnection)
  )
  .add(
    HttpApiEndpoint.del("remove", "/evals/credentials/connections/:id")
      .setPath(ConnectionPath)
      .addSuccess(Schema.Void)
  )
  .add(
    HttpApiEndpoint.post(
      "setDefault",
      "/evals/credentials/connections/:id/default"
    )
      .setPath(ConnectionPath)
      .addSuccess(CredentialConnection)
  )
  .add(
    HttpApiEndpoint.post("rotate", "/evals/credentials/connections/:id/rotate")
      .setPath(ConnectionPath)
      .setPayload(RotateCredentialConnection)
      .addSuccess(CredentialConnection)
  )
  .add(
    HttpApiEndpoint.post("verify", "/evals/credentials/connections/:id/verify")
      .setPath(ConnectionPath)
      .addSuccess(CredentialConnection)
  )
  .add(
    HttpApiEndpoint.post("startDevice", "/evals/credentials/device")
      .setPayload(StartDeviceAuth)
      .addSuccess(DeviceAuthChallenge)
  )
  .add(
    HttpApiEndpoint.get("deviceStatus", "/evals/credentials/device/:id")
      .setPath(AttemptPath)
      .addSuccess(DeviceAuthStatus)
  )
  .addError(BadRequest)
  .addError(Forbidden)
  .addError(InternalError)
  .addError(NotFound)
  .middleware(Authentication) {}
