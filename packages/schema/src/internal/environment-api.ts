import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import {
  AddSubscription,
  DeviceAuthChallenge,
  DeviceAuthStatus,
  StartDeviceAuth,
  Subscription,
} from "../domain/credentials";
import {
  AddVariables,
  EnvironmentVariable,
  UpdateVariable,
} from "../domain/environment";
import {
  BadRequest,
  Forbidden,
  InternalError,
  NotFound,
} from "../domain/errors";
import { Authentication } from "./authentication";

const IdPath = Schema.Struct({ id: Schema.String });

export class EnvironmentGroup extends HttpApiGroup.make("environment")
  .add(
    HttpApiEndpoint.get("variables", "/environment/variables").addSuccess(
      Schema.Array(EnvironmentVariable)
    )
  )
  .add(
    HttpApiEndpoint.post("addVariables", "/environment/variables")
      .setPayload(AddVariables)
      .addSuccess(Schema.Array(EnvironmentVariable))
  )
  .add(
    HttpApiEndpoint.patch("updateVariable", "/environment/variables/:id")
      .setPath(IdPath)
      .setPayload(UpdateVariable)
      .addSuccess(EnvironmentVariable)
  )
  .add(
    HttpApiEndpoint.del("removeVariable", "/environment/variables/:id")
      .setPath(IdPath)
      .addSuccess(Schema.Void)
  )
  .add(
    HttpApiEndpoint.get(
      "subscriptions",
      "/environment/subscriptions"
    ).addSuccess(Schema.Array(Subscription))
  )
  .add(
    HttpApiEndpoint.post("addSubscription", "/environment/subscriptions")
      .setPayload(AddSubscription)
      .addSuccess(Subscription)
  )
  .add(
    HttpApiEndpoint.del("removeSubscription", "/environment/subscriptions/:id")
      .setPath(IdPath)
      .addSuccess(Schema.Void)
  )
  .add(
    HttpApiEndpoint.post("startChatGpt", "/environment/subscriptions/chatgpt")
      .setPayload(StartDeviceAuth)
      .addSuccess(DeviceAuthChallenge)
  )
  .add(
    HttpApiEndpoint.get(
      "chatGptStatus",
      "/environment/subscriptions/chatgpt/:id"
    )
      .setPath(IdPath)
      .addSuccess(DeviceAuthStatus)
  )
  .addError(BadRequest)
  .addError(Forbidden)
  .addError(InternalError)
  .addError(NotFound)
  .middleware(Authentication) {}
