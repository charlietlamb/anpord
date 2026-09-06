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
  readonly promote?: { readonly channel: string; readonly version: number };
  readonly versions?: readonly string[];
}

/* Unique per call: two scenarios naming the same fixture collide as a conflict that reads like a product bug. */
let created = 0;

const nextId = (label: string) => {
  created += 1;
  return `${label}-${created}`;
};

/* Setup throws on failure, so a fixture that cannot be built fails here rather than in a later unrelated assertion. */
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
