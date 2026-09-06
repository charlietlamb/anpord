import { Otlp, OtlpSerialization } from "@effect/opentelemetry";
import { FetchHttpClient } from "@effect/platform";
import { Config, Layer, Option, Redacted } from "effect";

const telemetryConfig = Config.all({
  dataset: Config.string("AXIOM_DATASET").pipe(Config.withDefault("anpord")),
  token: Config.redacted("AXIOM_TOKEN").pipe(Config.option),
  url: Config.string("AXIOM_URL").pipe(
    Config.withDefault("https://api.axiom.co")
  ),
});

/* Shared across apps so worker and server spans land in one dataset, told apart
   by the name each passes. */
export const telemetryFor = (serviceName: string) =>
  Layer.unwrapEffect(
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
              resource: { serviceName },
            }).pipe(
              Layer.provide(
                Layer.mergeAll(
                  FetchHttpClient.layer,
                  OtlpSerialization.layerJson
                )
              )
            ),
        })
      )
    )
  );
