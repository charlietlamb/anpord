import { HttpClient } from "@effect/platform";
import { Effect, Layer, Option } from "effect";
import { ModelPrices } from "../../ports/model-source";
import { modelsDev } from "./models-dev";

export const ModelPricesLive = Layer.effect(
  ModelPrices,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const catalogue = yield* modelsDev;

    return ModelPrices.of({
      forModel: (model) =>
        catalogue.pipe(
          Effect.provideService(HttpClient.HttpClient, client),
          Effect.map(({ priced }) => Option.fromNullable(priced.get(model))),
          Effect.withSpan("ModelPrices.forModel", {
            attributes: { model },
          })
        ),
    });
  })
);
