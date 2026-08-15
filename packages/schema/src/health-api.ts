import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export const HealthResponse = Schema.Struct({ ok: Schema.Boolean });

export class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("health", "/healthz").addSuccess(HealthResponse)
) {}
