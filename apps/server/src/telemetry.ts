import { Otlp, OtlpSerialization } from "@effect/opentelemetry";
import { FetchHttpClient } from "@effect/platform";
import { Config, Layer, Option, Redacted } from "effect";

const SERVICE_NAME = "anpord-server";

const telemetryConfig = Config.all({
  dataset: Config.string("AXIOM_DATASET").pipe(Config.withDefault("anpord")),
  token: Config.redacted("AXIOM_TOKEN").pipe(Config.option),
  url: Config.string("AXIOM_URL").pipe(
    Config.withDefault("https://api.axiom.co")
  ),
});

/**
 * Spans and logs leave over OTLP, so the `Effect.withSpan` calls the services
 * already carry become the trace rather than needing a second instrumentation
 * pass. Logs are correlated with the span they were emitted inside.
 *
 * Without a token the layer is empty: a missing credential should leave the
 * server running without telemetry rather than refuse to start.
 */
export const TelemetryLive = Layer.unwrapEffect(
  telemetryConfig.pipe(
    Config.map(({ dataset, token, url }) =>
      Option.match(token, {
        onNone: () => Layer.empty,
        onSome: (secret) =>
          Otlp.layer({
            baseUrl: url,
            headers: {
              authorization: `Bearer ${Redacted.value(secret)}`,
              "x-axiom-dataset": dataset,
            },
            resource: { serviceName: SERVICE_NAME },
          }).pipe(
            Layer.provide(
              Layer.mergeAll(FetchHttpClient.layer, OtlpSerialization.layerJson)
            )
          ),
      })
    )
  )
);
