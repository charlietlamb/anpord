import { Anpord, type AnpordOptions } from "anpord";
import { contains, equals, isTrue, rejects } from "../harness/expect";
import { givenPrompt } from "../harness/given";
import type { Scenario } from "../harness/run";
import { drafting } from "../harness/surface";
import type { World } from "../world";

/** An address nothing answers on, so a scenario can ask what the client does
 * when the api cannot be reached at all. */
const UNREACHABLE = "http://127.0.0.1:1";

/**
 * The client is disposed whatever the scenario does, because a leaked one
 * keeps a background refresh fiber alive and the run never ends.
 */
const withClient = async (
  world: World,
  options: Omit<AnpordOptions, "apiKey">,
  use: (client: Anpord) => Promise<void>
) => {
  const client = new Anpord({
    apiKey: world.writeKey.key,
    baseUrl: world.baseUrl,
    ...options,
  });

  try {
    await use(client);
  } finally {
    await client.dispose();
  }
};

const sdkSurface = (client: Anpord) => ({
  get: (id: string, selector?: { readonly channel?: string }) =>
    client.prompts.get({ id, ...selector }),
  promote: async (id: string, channel: string, version: number) => {
    await client.prompts.promote({ channel, id, version });
  },
  update: async (id: string, content: string) =>
    (await client.prompts.update({ content, id })).version,
});

export const sdkScenarios: readonly Scenario<World>[] = [
  {
    name: "sdk: reads a prompt and reports how it was answered",
    run: async (world) => {
      const { id } = await givenPrompt(world, "sdk-basic", {
        content: "Summarise this ticket.",
      });

      await withClient(world, {}, async (client) => {
        const first = await client.prompts.get({ id });
        equals("served from the api", first.anpord.freshness, "fresh");
        contains("content", first.content, "Summarise");

        const second = await client.prompts.get({ id });
        equals("the second read is held", second.anpord.freshness, "cached");
      });
    },
  },
  {
    name: "sdk: an update drafts a version without moving production",
    run: async (world) => {
      const { id } = await givenPrompt(world, "sdk-drafting");

      await withClient(world, {}, async (client) => {
        await drafting(sdkSurface(client), id, 1);
      });
    },
  },
  {
    name: "sdk: interpolates variables and refuses a missing one",
    run: async (world) => {
      const { id } = await givenPrompt(world, "sdk-variables", {
        content: "Hello {{customer_name}}, welcome to {{product}}.",
      });

      await withClient(world, {}, async (client) => {
        const filled = await client.prompts.get({
          id,
          variables: { customer_name: "Ada", product: "Anpord" },
        });

        contains("name is substituted", filled.content, "Ada");
        contains("product is substituted", filled.content, "Anpord");
        isTrue(
          "no braces survive",
          !filled.content.includes("{{"),
          `still templated: ${filled.content}`
        );

        const failure = await rejects("a missing variable fails", () =>
          client.prompts.get({
            id,
            variables: { customer_name: "Ada" } as never,
          })
        );

        contains(
          "names what was missing",
          String((failure as Error).message),
          "product"
        );
      });
    },
  },
  {
    name: "sdk: a fallback answers when the api cannot be reached",
    run: async (world) => {
      await withClient(world, { baseUrl: UNREACHABLE }, async (client) => {
        const prompt = await client.prompts.get({
          fallback: "Offline body for {{name}}",
          id: "sdk-fallback",
          variables: { name: "Grace" },
        });

        contains("fallback is used", prompt.content, "Grace");
        equals("marked as a fallback", prompt.anpord.freshness, "fallback");
      });
    },
  },
  {
    name: "sdk: without a fallback an unreachable api fails loudly",
    run: async (world) => {
      await withClient(world, { baseUrl: UNREACHABLE }, async (client) => {
        await rejects("the read fails", () =>
          client.prompts.get({ id: "sdk-no-fallback" })
        );
      });
    },
  },
  {
    name: "sdk: a disabled cache asks the api every time",
    run: async (world) => {
      const { id } = await givenPrompt(world, "sdk-uncached");

      await withClient(world, { cache: false }, async (client) => {
        const first = await client.prompts.get({ id });
        const second = await client.prompts.get({ id });

        equals("first is fresh", first.anpord.freshness, "fresh");
        equals("second is fresh too", second.anpord.freshness, "fresh");
      });
    },
  },
  {
    name: "sdk: a channel read follows a promotion once the entry expires",
    run: async (world) => {
      const { id } = await givenPrompt(world, "sdk-channel", {
        content: "channel v1",
        versions: ["channel v2"],
      });

      await withClient(world, { cache: { ttlMs: 1 } }, async (client) => {
        await client.prompts.promote({ channel: "production", id, version: 1 });
        equals(
          "production serves v1",
          (await client.prompts.get({ channel: "production", id })).version,
          1
        );

        await client.prompts.promote({ channel: "production", id, version: 2 });
        equals(
          "production now serves v2",
          (await client.prompts.get({ channel: "production", id })).version,
          2
        );
      });
    },
  },
  {
    name: "sdk: concurrent reads of one prompt share a single fetch",
    run: async (world) => {
      const { id } = await givenPrompt(world, "sdk-single-flight", {
        content: "shared body",
      });

      await withClient(world, {}, async (client) => {
        const reads = await Promise.all(
          Array.from({ length: 12 }, () => client.prompts.get({ id }))
        );

        equals("every read answered", reads.length, 12);
        isTrue(
          "all agree on the content",
          reads.every((prompt) => prompt.content === "shared body"),
          "reads disagreed about the content"
        );
      });
    },
  },
];
