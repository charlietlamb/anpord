import { pingDatabase } from "@anpord/db/health";
import { AnpordApi } from "@anpord/schema/internal/api";
import { Unhealthy } from "@anpord/schema/internal/health-api";
import { HttpApiBuilder } from "@effect/platform";
import { Config, Duration, Effect } from "effect";

/* Shorter than the statement timeout, so the probe answers before the platform gives up on it. */
const PROBE_TIMEOUT = Duration.seconds(2);

/* Redis is deliberately not probed: a cache outage degrades to Postgres, so failing on it would roll back a deployment over a fault it survives. */
const health = pingDatabase.pipe(
  Effect.timeout(PROBE_TIMEOUT),
  Effect.tapError((cause) =>
    Effect.logError("health check failed").pipe(
      Effect.annotateLogs({ cause: String(cause) })
    )
  ),
  Effect.andThen(
    Config.string("BUILD_REVISION").pipe(Config.withDefault("development"))
  ),
  Effect.map((revision) => ({ ok: true, revision })),
  Effect.mapError(
    () => new Unhealthy({ message: "The database is not reachable." })
  )
);

export const HealthHandlers = HttpApiBuilder.group(
  AnpordApi,
  "health",
  (handlers) => handlers.handle("health", () => health)
);
