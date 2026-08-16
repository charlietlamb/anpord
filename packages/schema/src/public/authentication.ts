import { HttpApiMiddleware, HttpApiSecurity } from "@effect/platform";
import { Unauthorized } from "../domain/errors";
import { CurrentActor } from "../internal/authentication";

export class ApiKeyAuthentication extends HttpApiMiddleware.Tag<ApiKeyAuthentication>()(
  "@anpord/schema/ApiKeyAuthentication",
  {
    failure: Unauthorized,
    provides: CurrentActor,
    security: { bearer: HttpApiSecurity.bearer },
  }
) {}
