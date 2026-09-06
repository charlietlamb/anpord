import { HttpClient } from "@effect/platform";
import { Effect, Layer } from "effect";
import { AvailableModels } from "../../ports/model-source";
import { modelsDev } from "./models-dev";

/* models.dev is the catalogue OpenCode itself resolves providers from; asking the
   installed CLI instead only answers with providers this machine holds a key for. */
export const layer = Layer.effect(
  AvailableModels,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const catalogue = yield* modelsDev;

    return AvailableModels.of({
      forHarness: () =>
        catalogue.pipe(
          Effect.map((models) => models.ids),
          Effect.provideService(HttpClient.HttpClient, client)
        ),
    });
  })
);
