import type { CatalogueModel } from "@anpord/schema/domain/evals";

/**
 * The providers a picker should offer first, best first.
 *
 * Curated rather than measured, because models.dev carries no popularity of
 * any kind: no downloads, no rank, no usage. The one signal available is how
 * many hosts resell a model, and that ranks open-weight models above Claude
 * and GPT, which only their own vendor serves. A short ordered list is
 * honest about being a judgement, and it needs revisiting when a vendor
 * starts mattering rather than silently going stale.
 */
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

/**
 * Orders models so the first twenty are ones somebody would actually pick.
 *
 * Within a vendor the newest wins, because a picker offering last year's model
 * above this year's reads as stale even when the list is complete.
 */
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

/**
 * Takes each vendor's best in turn, so a first page shows the field.
 *
 * Sorted alone, Anthropic's thirteen models and OpenAI's seven fill all twenty
 * places and a reader never learns GLM or Kimi are offered at all. Round after
 * round each vendor contributes one, so the first rows are the best of every
 * lab rather than the whole of the first two.
 */
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

/** Matched against the id and the name, so both `sonnet` and
 * `anthropic/claude` find the same model. */
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
