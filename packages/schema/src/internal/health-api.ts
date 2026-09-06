import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export const HealthResponse = Schema.Struct({
  ok: Schema.Boolean,
  revision: Schema.optional(Schema.String),
});

/* The 503 is what tells App Runner to hold the old version rather than shift traffic. */
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
