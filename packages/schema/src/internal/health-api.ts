import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export const HealthResponse = Schema.Struct({ ok: Schema.Boolean });

/**
 * The deployment platform decides whether to shift traffic from this, so it has
 * to be able to fail. A 503 is what tells App Runner to hold the old version
 * rather than replacing a working one with a broken one.
 */
export class Unhealthy extends Schema.TaggedError<Unhealthy>()(
  "Unhealthy",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 503 })
) {}

export class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("health", "/healthz")
    .addSuccess(HealthResponse)
    .addError(Unhealthy)
) {}
