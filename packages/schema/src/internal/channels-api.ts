import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import {
  Channel,
  CreateChannelRequest,
  UpdateChannelRequest,
} from "../domain/channels";
import { Conflict, NotFound } from "../domain/errors";
import { ChannelName } from "../domain/prompts";
import { Authentication } from "./authentication";

const ChannelPath = Schema.Struct({ name: ChannelName });

export class ChannelsGroup extends HttpApiGroup.make("channels")
  .add(
    HttpApiEndpoint.get("list", "/channels").addSuccess(Schema.Array(Channel))
  )
  .add(
    HttpApiEndpoint.post("create", "/channels")
      .setPayload(CreateChannelRequest)
      .addSuccess(Channel)
  )
  .add(
    HttpApiEndpoint.patch("update", "/channels/:name")
      .setPath(ChannelPath)
      .setPayload(UpdateChannelRequest)
      .addSuccess(Channel)
  )
  .add(
    HttpApiEndpoint.del("remove", "/channels/:name")
      .setPath(ChannelPath)
      .addSuccess(Schema.Void)
  )
  .addError(Conflict)
  .addError(NotFound)
  .middleware(Authentication) {}
