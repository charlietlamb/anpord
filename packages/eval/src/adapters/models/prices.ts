import { HttpClient } from "@effect/platform";
import { Effect, Layer, Option } from "effect";
import { ModelPrices } from "../../ports/model-source";
import { modelsDev } from "./models-dev";

/**
 * What each model charges, from the catalogue we already fetch.
 *
 * One source rather than a resolver per harness, because a rate belongs to
 * the model and not to whoever invoked it: the same model run through Codex
 * and through OpenCode costs the same, and a harness that ships no catalogue
 * of its own still bills at the published rate.
 *
 * Shares `modelsDev`'s cached fetch, so pricing adds no request.
 */
export const ModelPricesLive = Layer.effect(
  ModelPrices,
  Effect.gen(function* () {
    /* The client is taken here and closed over, so the fetch it feeds stays
       inside this adapter: a caller asking a finished trial what it cost
       should not have to hold an HTTP client to be told. */
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
