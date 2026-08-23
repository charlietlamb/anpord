import { HttpClient } from "@effect/platform";
import { Effect, Schema } from "effect";
import { ModelsUnreadable } from "../../domain/errors";
import type { ModelDescription } from "../../ports/model-source";

const SOURCE = "https://models.dev/api.json";

/* Only what a picker needs. The payload carries far more per model, and
   decoding fields nobody reads would let a shape change upstream break a
   catalogue that would otherwise still be usable. */
const DevModel = Schema.Struct({
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
}

const fetchCatalogue = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient;

  const payload = yield* client.get(SOURCE).pipe(
    Effect.flatMap((response) => response.json),
    Effect.flatMap(decodeCatalogue),
    Effect.mapError((cause) => new ModelsUnreadable({ cause, source: SOURCE }))
  );

  const described = new Map<string, ModelDescription>();
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
    }
  }

  return { described, ids } satisfies ModelsDevCatalogue;
}).pipe(Effect.withSpan("ModelsDev.fetch"));

/**
 * The catalogue, fetched once.
 *
 * Cached because it is seven thousand entries behind one request, read on
 * every visit to the form, and changes on the order of days.
 */
export const modelsDev = Effect.cached(fetchCatalogue);
