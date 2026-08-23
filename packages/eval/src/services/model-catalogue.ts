import type { ModelCatalogue } from "@anpord/schema/domain/evals";
import { Context, Effect, Layer } from "effect";
import { ModelDescriptionsLive } from "../adapters/models/descriptions";
import { AvailableModelsLive } from "../adapters/models/resolve";
import type { HarnessName } from "../domain/cell";
import { describedBy } from "../domain/model-catalogue";
import {
  byPopularity,
  interleavedByVendor,
  matches,
  type RankedModel,
} from "../domain/model-ranking";
import {
  AvailableModels,
  type ModelDescription,
  ModelDescriptions,
} from "../ports/model-source";

/** What a picker shows before anybody types: enough to choose from without
 * being a list to scroll, and small enough that opening it costs nothing. */
const PAGE = 20;

export interface CatalogueQuery {
  readonly harness: typeof HarnessName.Type;
  readonly query?: string | undefined;
}

export interface ModelCatalogueShape {
  readonly forHarness: (
    request: CatalogueQuery
  ) => Effect.Effect<ModelCatalogue>;
}

export class ModelCatalogues extends Context.Tag(
  "@anpord/eval/ModelCatalogues"
)<ModelCatalogues, ModelCatalogueShape>() {}

const NO_IDS: readonly string[] = [];
const NO_DESCRIPTIONS: ReadonlyMap<string, ModelDescription> = new Map();

export const make = Effect.gen(function* () {
  const available = yield* AvailableModels;
  const descriptions = yield* ModelDescriptions;

  const ranked = yield* Effect.cachedFunction(
    Effect.fn("ModelCatalogues.rank")(function* (
      harness: typeof HarnessName.Type
    ) {
      const { described, ids } = yield* Effect.all(
        {
          described: descriptions.forHarness(harness).pipe(
            Effect.tapError((error) =>
              Effect.logWarning("Model catalogue unreachable; ids only").pipe(
                Effect.annotateLogs({ harness, source: error.source })
              )
            ),
            Effect.orElseSucceed(() => NO_DESCRIPTIONS)
          ),
          ids: available.forHarness(harness).pipe(
            Effect.tapError((error) =>
              Effect.logWarning("Harness could not list its models").pipe(
                Effect.annotateLogs({ harness, source: error.source })
              )
            ),
            Effect.orElseSucceed(() => NO_IDS)
          ),
        },
        { concurrency: "unbounded" }
      );

      return interleavedByVendor(
        describedBy(ids, described).toSorted(byPopularity)
      );
    })
  );

  const forHarness = Effect.fn("ModelCatalogues.forHarness")(function* (
    request: CatalogueQuery
  ) {
    const all: readonly RankedModel[] = yield* ranked(request.harness);
    const query = request.query ?? "";

    const found =
      query.trim() === ""
        ? all
        : all.filter((model) => matches(model, query)).toSorted(byPopularity);

    return {
      harness: request.harness,
      models: found
        .slice(0, PAGE)
        .map(({ displayName, id, summary, vendor }) => ({
          displayName,
          id,
          summary,
          vendor,
        })),
      total: found.length,
    } satisfies ModelCatalogue;
  });

  return ModelCatalogues.of({ forHarness });
});

export const layerWithoutDependencies = Layer.effect(ModelCatalogues, make);

export const layer = layerWithoutDependencies.pipe(
  Layer.provide(Layer.mergeAll(AvailableModelsLive, ModelDescriptionsLive))
);
