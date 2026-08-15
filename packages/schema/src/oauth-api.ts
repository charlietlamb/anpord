import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { NotFound } from "./errors";

export const OAuthClient = Schema.Struct({
  name: Schema.String,
});

const ClientPath = Schema.Struct({ clientId: Schema.String });

export class OAuthGroup extends HttpApiGroup.make("oauth")
  .add(
    HttpApiEndpoint.get("client", "/oauth/clients/:clientId")
      .setPath(ClientPath)
      .addSuccess(OAuthClient)
  )
  .addError(NotFound) {}
