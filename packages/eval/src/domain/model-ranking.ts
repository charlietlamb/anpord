import type { CatalogueModel } from "@anpord/schema/domain/evals";

/* Curated: models.dev publishes no popularity signal, and reseller count ranks
   open-weight models above single-vendor Claude and GPT. */
const RANKED_VENDORS: readonly string[] = [
  "anthropic",
  "openai",
  "google",
  "xai",
  "zai",
  "moonshotai",
  "deepseek",
  "alibaba",
  "minimax",
  "mistral",
  "meta",
  "fireworks-ai",
  "groq",
  "cerebras",
  "openrouter",
];

const UNRANKED = RANKED_VENDORS.length;

const rankOf = (vendor: string | null) => {
  const found = vendor === null ? -1 : RANKED_VENDORS.indexOf(vendor);

  return found === -1 ? UNRANKED : found;
};

export interface RankedModel extends CatalogueModel {
  readonly releasedAt: string | null;
}

export const byPopularity = (left: RankedModel, right: RankedModel) => {
  const vendors = rankOf(left.vendor) - rankOf(right.vendor);

  if (vendors !== 0) {
    return vendors;
  }

  const released = (right.releasedAt ?? "").localeCompare(
    left.releasedAt ?? ""
  );

  return released === 0 ? left.id.localeCompare(right.id) : released;
};

/* Sorted alone, Anthropic and OpenAI fill the whole first page. */
export const interleavedByVendor = (
  models: readonly RankedModel[]
): readonly RankedModel[] => {
  const queues = new Map<string, RankedModel[]>();
  const rest: RankedModel[] = [];

  for (const model of models) {
    if (rankOf(model.vendor) === UNRANKED) {
      rest.push(model);
      continue;
    }

    const vendor = model.vendor ?? "";
    const queue = queues.get(vendor);

    if (queue === undefined) {
      queues.set(vendor, [model]);
    } else {
      queue.push(model);
    }
  }

  const rounds: RankedModel[] = [];
  const pending = [...queues.values()];

  while (pending.length > 0) {
    for (const queue of pending) {
      const next = queue.shift();

      if (next !== undefined) {
        rounds.push(next);
      }
    }

    for (let index = pending.length - 1; index >= 0; index -= 1) {
      if (pending[index]?.length === 0) {
        pending.splice(index, 1);
      }
    }
  }

  return [...rounds, ...rest];
};

export const matches = (model: RankedModel, query: string) => {
  const needle = query.trim().toLowerCase();

  if (needle === "") {
    return true;
  }

  return (
    model.id.toLowerCase().includes(needle) ||
    model.displayName.toLowerCase().includes(needle)
  );
};
