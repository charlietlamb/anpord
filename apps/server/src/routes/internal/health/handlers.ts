import { pingDatabase } from "@anpord/db/health";
import { AnpordApi } from "@anpord/schema/internal/api";
import { Unhealthy } from "@anpord/schema/internal/health-api";
import { HttpApiBuilder } from "@effect/platform";
import { Duration, Effect } from "effect";

/** Shorter than the statement timeout, because a health check that waits as
 * long as a real query cannot answer before the platform gives up on it. */
const PROBE_TIMEOUT = Duration.seconds(2);

/**
 * Answers for the dependency the service cannot run without. A constant `ok`
 * would let a deployment with an unreachable database pass its health check,
 * take traffic, and fail every request — while the platform holds it healthy
 * and never rolls back.
 *
 * Redis is deliberately not probed: a cache outage degrades to Postgres rather
 * than breaking the service, so failing on it would replace a working
 * deployment over a fault it survives.
 */
const health = pingDatabase.pipe(
  Effect.timeout(PROBE_TIMEOUT),
  Effect.tapError((cause) =>
    Effect.logError("health check failed").pipe(
      Effect.annotateLogs({ cause: String(cause) })
    )
  ),
  Effect.as({ ok: true }),
  Effect.mapError(
    () => new Unhealthy({ message: "The database is not reachable." })
  )
);

export const HealthHandlers = HttpApiBuilder.group(
  AnpordApi,
  "health",
  (handlers) => handlers.handle("health", () => health)
);
