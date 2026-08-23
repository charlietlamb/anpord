import { FileSystem, Path } from "@effect/platform";
import { Config, Effect, Layer, Schema } from "effect";
import { ModelsUnreadable } from "../../domain/errors";
import {
  AvailableModels,
  type ModelDescription,
  ModelDescriptions,
} from "../../ports/model-source";

const CachedModel = Schema.Struct({
  description: Schema.NullishOr(Schema.String),
  display_name: Schema.NullishOr(Schema.String),

  priority: Schema.Number,
  slug: Schema.String,

  visibility: Schema.NullishOr(Schema.String),
});

const ModelsCache = Schema.Struct({
  models: Schema.Array(CachedModel),
});

const decodeCache = Schema.decodeUnknown(Schema.parseJson(ModelsCache));

type CachedModel = typeof CachedModel.Type;

const NONE: readonly CachedModel[] = [];

export const listedIn = (
  cache: typeof ModelsCache.Type
): readonly CachedModel[] =>
  cache.models
    .filter((model) => model.visibility === "list")
    .toSorted((left, right) => left.priority - right.priority);

const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const cachePath = Config.string("HOME").pipe(
    Effect.map((home) => path.join(home, ".codex", "models_cache.json"))
  );

  const listed = Effect.fn("Codex.listedModels")(function* () {
    const target = yield* cachePath.pipe(
      Effect.mapError(
        (cause) => new ModelsUnreadable({ cause, source: "HOME" })
      )
    );

    const present = yield* fs
      .exists(target)
      .pipe(Effect.orElseSucceed(() => false));

    if (!present) {
      return NONE;
    }

    const cache = yield* fs.readFileString(target).pipe(
      Effect.flatMap(decodeCache),
      Effect.mapError(
        (cause) => new ModelsUnreadable({ cause, source: target })
      )
    );

    return listedIn(cache);
  });

  return listed;
});

export const layer = Layer.effect(
  AvailableModels,
  Effect.map(make, (listed) =>
    AvailableModels.of({
      forHarness: () =>
        Effect.map(listed(), (models) => models.map((model) => model.slug)),
    })
  )
);

export const descriptionsLayer = Layer.effect(
  ModelDescriptions,
  Effect.map(make, (listed) =>
    ModelDescriptions.of({
      forHarness: () =>
        Effect.map(listed(), (models) => {
          const described = new Map<string, ModelDescription>();

          for (const model of models) {
            described.set(model.slug, {
              displayName: model.display_name ?? model.slug,
              releasedAt: null,
              summary: model.description ?? null,
              vendor: "openai",
            });
          }

          return described as ReadonlyMap<string, ModelDescription>;
        }),
    })
  )
);
