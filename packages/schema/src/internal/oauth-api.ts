import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { InternalError, NotFound } from "../domain/errors";
import { Authentication } from "./authentication";

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
  .addError(InternalError)
  .addError(NotFound)
  /* Anyone may register a client, so this returns attacker-chosen text the consent screen renders; a session keeps it from being an open lookup. */
  .middleware(Authentication) {}
