import { HttpClient } from "@effect/platform";
import { Effect, Layer } from "effect";
import { AvailableModels } from "../../ports/model-source";
import { modelsDev } from "./models-dev";

/**
 * Every model OpenCode can address.
 *
 * models.dev is the catalogue OpenCode itself resolves providers from, so it
 * is the same list the harness would accept rather than a second opinion
 * about it. Asking the installed CLI instead would answer with the providers
 * this machine happens to hold a key for, which was 45 models against 7248,
 * and would make the picker a fact about our laptop rather than about the
 * harness.
 *
 * The catalogue can lag a new release by a few days. A model missing from it
 * still runs: the id reaches the harness as written, and an unknown one fails
 * the trial with an unknown-model error rather than quietly running something
 * else.
 */
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
