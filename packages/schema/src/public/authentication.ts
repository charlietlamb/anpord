import { HttpApiMiddleware, HttpApiSecurity } from "@effect/platform";
import { CurrentActor } from "../authentication";
import { Unauthorized } from "../errors";

export class ApiKeyAuthentication extends HttpApiMiddleware.Tag<ApiKeyAuthentication>()(
  "@anpord/schema/ApiKeyAuthentication",
  {
    failure: Unauthorized,
    provides: CurrentActor,
    security: { bearer: HttpApiSecurity.bearer },
  }
) {}
