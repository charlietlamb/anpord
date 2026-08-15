import { HttpApiMiddleware, HttpApiSecurity } from "@effect/platform";
import { Context } from "effect";
import type { Actor } from "./actor";
import { Unauthorized } from "./errors";

export class CurrentActor extends Context.Tag("@anpord/schema/CurrentActor")<
  CurrentActor,
  Actor
>() {}

export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  "@anpord/schema/Authentication",
  {
    failure: Unauthorized,
    provides: CurrentActor,
    security: {
      session: HttpApiSecurity.apiKey({
        in: "cookie",
        key: "anpord.session_token",
      }),
    },
  }
) {}
