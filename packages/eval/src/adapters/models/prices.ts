import { HttpClient } from "@effect/platform";
import { Effect, Layer, Option } from "effect";
import { ModelPrices } from "../../ports/model-source";
import { modelsDev } from "./models-dev";

/* One source, not one per harness: a rate belongs to the model, not the caller.
   Shares `modelsDev`'s cached fetch, so pricing adds no request. */
export const ModelPricesLive = Layer.effect(
  ModelPrices,
  Effect.gen(function* () {
    /* Closed over here so a caller asking what a trial cost need not hold an
       HTTP client. */
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
