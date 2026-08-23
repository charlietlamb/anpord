import { HttpClient } from "@effect/platform";
import { Effect, Layer } from "effect";
import { ModelDescriptions } from "../../ports/model-source";
import { modelsDev } from "./models-dev";

/** Names and summaries for every model models.dev lists, keyed by the
 * `provider/model` id the run is given. */
export const descriptionsLayer = Layer.effect(
  ModelDescriptions,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const catalogue = yield* modelsDev;

    return ModelDescriptions.of({
      forHarness: () =>
        catalogue.pipe(
          Effect.map((models) => models.described),
          Effect.provideService(HttpClient.HttpClient, client)
        ),
    });
  })
);
