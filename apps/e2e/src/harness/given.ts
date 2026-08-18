import type { World } from "../world";
import { callApiOrThrow } from "./http";

export interface PromptShape {
  readonly channel?: string;
  readonly content: string;
  readonly id: string;
  readonly name: string;
  readonly version: number;
}

export interface PromptSpec {
  readonly content?: string;
  /** Channel to point at a version once the versions exist. */
  readonly promote?: { readonly channel: string; readonly version: number };
  /** Versions to append after the first, in order. */
  readonly versions?: readonly string[];
}

/**
 * Ids are unique per call rather than written by hand. A scenario that names
 * its own fixture has to know what every other scenario named, and the moment
 * two agree the second one fails with a conflict that reads as a product bug.
 */
let created = 0;

const nextId = (label: string) => {
  created += 1;
  return `${label}-${created}`;
};

/**
 * The world a scenario needs, stated rather than assembled. Setup goes through
 * the API and throws on failure, so a scenario that cannot build its fixture
 * says so where it happened instead of failing a later assertion about
 * something else.
 */
export const givenPrompt = async (
  world: World,
  label: string,
  spec: PromptSpec = {}
) => {
  const id = nextId(label);

  const first = await callApiOrThrow<PromptShape>(
    world.baseUrl,
    world.writeKey.key,
    "prompts.create",
    { content: spec.content ?? "Original body.", id, name: label }
  );

  let latest = first.version;

  for (const content of spec.versions ?? []) {
    const added = await callApiOrThrow<PromptShape>(
      world.baseUrl,
      world.writeKey.key,
      "prompts.update",
      { content, id }
    );
    latest = added.version;
  }

  if (spec.promote) {
    await callApiOrThrow(world.baseUrl, world.writeKey.key, "prompts.promote", {
      channel: spec.promote.channel,
      id,
      version: spec.promote.version,
    });
  }

  return { id, version: latest };
};
