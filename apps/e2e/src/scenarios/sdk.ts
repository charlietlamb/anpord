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
        const failure = await rejects("the read fails", () =>
          client.prompts.get({ id: "sdk-no-fallback" })
        );

        /* Carrying no status is what marks it as an availability failure
           rather than an answer, which is the difference between reaching for
           a fallback and giving up. */
        equals(
          "as something that never reached the api",
          (failure as { status?: number }).status,
          undefined
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
    name: "sdk: concurrent cold reads agree, and warm reads come from the cache",
    run: async (world) => {
      const { id } = await givenPrompt(world, "sdk-concurrent", {
        content: "shared body",
      });

      await withClient(world, {}, async (client) => {
        const cold = await Promise.all(
          Array.from({ length: 12 }, () => client.prompts.get({ id }))
        );

        isTrue(
          "all agree on the content",
          cold.every((prompt) => prompt.content === "shared body"),
          "reads disagreed about the content"
        );

        /* Every cold read fetches: the cache is filled by whichever finishes,
           it does not coalesce them. Asserted rather than assumed, so adding
           single flight is a change this scenario notices. */
        equals(
          "none of them was served from the cache",
          cold.filter((prompt) => prompt.anpord.freshness === "cached").length,
          0
        );

        const warm = await Promise.all(
          Array.from({ length: 12 }, () => client.prompts.get({ id }))
        );
        equals(
          "once filled, every read is",
          warm.filter((prompt) => prompt.anpord.freshness === "cached").length,
          12
        );
      });
    },
  },
];
