import { HttpApiMiddleware, HttpApiSecurity } from "@effect/platform";
import { Context } from "effect";
import type { Actor } from "../domain/actor";
import { Unauthorized } from "../domain/errors";

export const COOKIE_PREFIX = "anpord";

export const SESSION_COOKIE = `${COOKIE_PREFIX}.session_token`;

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
        key: SESSION_COOKIE,
      }),
    },
  }
) {}
