import { FileSystem, Path } from "@effect/platform";
import { Config, Effect, Schema } from "effect";
import { ModelsUnreadable } from "../../domain/errors";
import type { ModelDescription } from "../../ports/model-source";

const CachedModel = Schema.Struct({
  description: Schema.NullishOr(Schema.String),
  display_name: Schema.NullishOr(Schema.String),
  priority: Schema.Number,
  slug: Schema.String,
  visibility: Schema.NullishOr(Schema.String),
});

type CachedModel = typeof CachedModel.Type;

const ModelsCache = Schema.Struct({
  models: Schema.Array(CachedModel),
});

const decodeCache = Schema.decodeUnknown(Schema.parseJson(ModelsCache));

export const listedIn = (
  cache: typeof ModelsCache.Type
): readonly CachedModel[] =>
  cache.models
    .filter((model) => model.visibility === "list")
    .toSorted((left, right) => left.priority - right.priority);

export const codexModels = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const target = yield* Config.string("HOME").pipe(
    Effect.map((home) => path.join(home, ".codex", "models_cache.json")),
    Effect.mapError((cause) => new ModelsUnreadable({ cause, source: "HOME" }))
  );

  if (!(yield* fs.exists(target).pipe(Effect.orElseSucceed(() => false)))) {
    return [];
  }

  return yield* fs.readFileString(target).pipe(
    Effect.flatMap(decodeCache),
    Effect.map(listedIn),
    Effect.mapError((cause) => new ModelsUnreadable({ cause, source: target }))
  );
}).pipe(Effect.withSpan("Codex.listedModels"));

export const codexDescriptions = (
  models: readonly CachedModel[]
): ReadonlyMap<string, ModelDescription> =>
  new Map(
    models.map((model) => [
      model.slug,
      {
        displayName: model.display_name ?? model.slug,
        releasedAt: null,
        summary: model.description ?? null,
        vendor: "openai",
      },
    ])
  );
