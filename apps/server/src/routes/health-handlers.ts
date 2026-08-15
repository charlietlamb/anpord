import { AnpordApi } from "@anpord/schema/api";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";

export const HealthHandlers = HttpApiBuilder.group(
  AnpordApi,
  "health",
  (handlers) => handlers.handle("health", () => Effect.succeed({ ok: true }))
);
