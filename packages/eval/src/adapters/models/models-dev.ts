import { HttpClient } from "@effect/platform";
import { Effect, Schema } from "effect";
import { ModelsUnreadable } from "../../domain/errors";
import type { ModelPrice } from "../../domain/model-price";
import type { ModelDescription } from "../../ports/model-source";

const SOURCE = "https://models.dev/api.json";

/* Only what a picker needs. The payload carries far more per model, and
   decoding fields nobody reads would let a shape change upstream break a
   catalogue that would otherwise still be usable. */
/* Optional throughout: an open-weight model published with no rates is
   priceless rather than free, and a missing block must not cost the entry. */
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

interface ModelsDevCatalogue {
  readonly described: ReadonlyMap<string, ModelDescription>;
  readonly ids: readonly string[];
  readonly priced: ReadonlyMap<string, ModelPrice>;
}

/* Both sides of the exchange are needed to charge anything, so a model that
   publishes only one is left unpriced rather than half-priced. */
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

        /* A trial records the model it was asked to run, which for most
           harnesses is the bare id rather than the qualified one, so the
           bare key is kept alongside the qualified one.

           Several providers resell the same model at different rates and
           only one can hold the bare key. The lowest is chosen, so an
           estimate errs low rather than landing on whichever provider the
           catalogue happened to list first -- an arbitrary winner made the
           same run cost different amounts between deploys. A caller that
           needs the exact rate asks for the qualified id. */
        const held = priced.get(model);

        if (held === undefined || price.input < held.input) {
          priced.set(model, price);
        }
      }
    }
  }

  return { described, ids, priced } satisfies ModelsDevCatalogue;
}).pipe(Effect.withSpan("ModelsDev.fetch"));

/**
 * The catalogue, fetched once.
 *
 * Cached because it is seven thousand entries behind one request, read on
 * every visit to the form, and changes on the order of days.
 */
export const modelsDev = Effect.cached(fetchCatalogue);
