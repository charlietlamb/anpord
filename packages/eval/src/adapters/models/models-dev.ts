import { HttpClient } from "@effect/platform";
import { Effect, Schema } from "effect";
import { ModelsUnreadable } from "../../domain/errors";
import type { ModelPrice } from "../../domain/model-price";
import type { ModelDescription } from "../../ports/model-source";

const SOURCE = "https://models.dev/api.json";

const DevCost = Schema.Struct({
  cache_read: Schema.optional(Schema.NullOr(Schema.Number)),
  cache_write: Schema.optional(Schema.NullOr(Schema.Number)),
  input: Schema.optional(Schema.NullOr(Schema.Number)),
  output: Schema.optional(Schema.NullOr(Schema.Number)),
});

const DevModel = Schema.Struct({
  cost: Schema.optional(Schema.NullOr(DevCost)),
  description: Schema.optional(Schema.NullOr(Schema.String)),
  name: Schema.optional(Schema.NullOr(Schema.String)),
  release_date: Schema.optional(Schema.NullOr(Schema.String)),
  status: Schema.optional(Schema.NullOr(Schema.String)),
});

const DevProvider = Schema.Struct({
  models: Schema.Record({ key: Schema.String, value: DevModel }),
  name: Schema.optional(Schema.NullOr(Schema.String)),
});

const decodeCatalogue = Schema.decodeUnknown(
  Schema.Record({ key: Schema.String, value: DevProvider })
);

export interface ModelsDevCatalogue {
  readonly described: ReadonlyMap<string, ModelDescription>;
  readonly ids: readonly string[];
  readonly priced: ReadonlyMap<string, ModelPrice>;
}

const priceOf = (cost: typeof DevCost.Type | null | undefined) => {
  if (cost === null || cost === undefined) {
    return null;
  }

  const { input, output } = cost;

  return typeof input === "number" && typeof output === "number"
    ? {
        cacheRead: cost.cache_read ?? null,
        cacheWrite: cost.cache_write ?? null,
        input,
        output,
      }
    : null;
};

const fetchCatalogue = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient;

  const payload = yield* client.get(SOURCE).pipe(
    Effect.flatMap((response) => response.json),
    Effect.flatMap(decodeCatalogue),
    Effect.mapError((cause) => new ModelsUnreadable({ cause, source: SOURCE }))
  );

  const described = new Map<string, ModelDescription>();
  const priced = new Map<string, ModelPrice>();
  const ids: string[] = [];

  for (const [provider, listed] of Object.entries(payload)) {
    for (const [model, found] of Object.entries(listed.models)) {
      if (found.status === "deprecated") {
        continue;
      }

      const id = `${provider}/${model}`;

      ids.push(id);
      described.set(id, {
        displayName: found.name ?? model,
        releasedAt: found.release_date ?? null,
        summary: found.description ?? null,
        vendor: provider,
      });

      const price = priceOf(found.cost);

      if (price !== null) {
        priced.set(id, price);

        const held = priced.get(model);

        if (held === undefined || price.input < held.input) {
          priced.set(model, price);
        }
      }
    }
  }

  return { described, ids, priced } satisfies ModelsDevCatalogue;
}).pipe(Effect.withSpan("ModelsDev.fetch"));

export const modelsDev = Effect.cached(fetchCatalogue);
