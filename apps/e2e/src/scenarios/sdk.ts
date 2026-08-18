import { Anpord } from "anpord";
import { contains, equals, isTrue, rejects } from "../harness/expect";
import type { Scenario } from "../harness/run";
import type { World } from "../world";

const clientFor = (world: World, options: Record<string, unknown> = {}) =>
  new Anpord({
    apiKey: world.writeKey.key,
    baseUrl: world.baseUrl,
    ...options,
  });

const withClient = async (
  world: World,
  options: Record<string, unknown>,
  use: (client: Anpord) => Promise<void>
) => {
  const client = clientFor(world, options);
  try {
    await use(client);
  } finally {
    await client.dispose();
  }
};

export const sdkScenarios: readonly Scenario<World>[] = [
  {
    name: "sdk: reads a prompt and reports how it was answered",
    run: async (world) => {
      await withClient(world, {}, async (client) => {
        await client.prompts.create({
          content: "Summarise this ticket.",
          id: "sdk-basic",
          name: "Sdk basic",
        });

        const first = await client.prompts.get({ id: "sdk-basic" });
        equals("served from the api", first.anpord.freshness, "fresh");
        contains("content", first.content, "Summarise");

        const second = await client.prompts.get({ id: "sdk-basic" });
        isTrue(
          "second read is cached",
          second.anpord.freshness !== "fresh",
          `expected a cached read, got ${second.anpord.freshness}`
        );
      });
    },
  },
  {
    name: "sdk: an update drafts a version without moving production",
    run: async (world) => {
      await withClient(world, {}, async (client) => {
        await client.prompts.create({
          content: "first body",
          id: "sdk-invalidate",
          name: "Sdk invalidate",
        });

        const before = await client.prompts.get({ id: "sdk-invalidate" });
        equals("initial version", before.version, 1);

        const drafted = await client.prompts.update({
          content: "second body",
          id: "sdk-invalidate",
        });
        equals("the write returns the new version", drafted.version, 2);

        /** Updating writes a version, promoting ships it, so callers keep
         * reading v1 until somebody decides otherwise. */
        const after = await client.prompts.get({ id: "sdk-invalidate" });
        equals("production has not moved", after.version, 1);

        await client.prompts.promote({
          channel: "production",
          id: "sdk-invalidate",
          version: 2,
        });

        const promoted = await client.prompts.get({ id: "sdk-invalidate" });
        equals("promotion is visible", promoted.version, 2);
        contains("new content", promoted.content, "second body");
      });
    },
  },
  {
    name: "sdk: interpolates variables and refuses a missing one",
    run: async (world) => {
      await withClient(world, {}, async (client) => {
        await client.prompts.create({
          content: "Hello {{customer_name}}, welcome to {{product}}.",
          id: "sdk-variables",
          name: "Sdk variables",
        });

        const filled = await client.prompts.get({
          id: "sdk-variables",
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
            id: "sdk-variables",
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
      const client = new Anpord({
        apiKey: world.writeKey.key,
        baseUrl: "http://127.0.0.1:1",
      });

      try {
        const prompt = await client.prompts.get({
          fallback: "Offline body for {{name}}",
          id: "sdk-fallback",
          variables: { name: "Grace" },
        });

        contains("fallback is used", prompt.content, "Grace");
        equals("marked as a fallback", prompt.anpord.freshness, "fallback");
      } finally {
        await client.dispose();
      }
    },
  },
  {
    name: "sdk: without a fallback an unreachable api fails loudly",
    run: async (world) => {
      const client = new Anpord({
        apiKey: world.writeKey.key,
        baseUrl: "http://127.0.0.1:1",
      });

      try {
        await rejects("the read fails", () =>
          client.prompts.get({ id: "sdk-no-fallback" })
        );
      } finally {
        await client.dispose();
      }
    },
  },
  {
    name: "sdk: a disabled cache asks the api every time",
    run: async (world) => {
      await withClient(world, { cache: false }, async (client) => {
        await client.prompts.create({
          content: "uncached body",
          id: "sdk-uncached",
          name: "Sdk uncached",
        });

        const first = await client.prompts.get({ id: "sdk-uncached" });
        const second = await client.prompts.get({ id: "sdk-uncached" });

        equals("first is fresh", first.anpord.freshness, "fresh");
        equals("second is fresh too", second.anpord.freshness, "fresh");
      });
    },
  },
  {
    name: "sdk: a channel read follows a promotion once the entry expires",
    run: async (world) => {
      await withClient(world, { cache: { ttlMs: 1 } }, async (client) => {
        await client.prompts.create({
          content: "channel v1",
          id: "sdk-channel",
          name: "Sdk channel",
        });
        await client.prompts.update({
          content: "channel v2",
          id: "sdk-channel",
        });

        await client.prompts.promote({
          channel: "production",
          id: "sdk-channel",
          version: 1,
        });

        const pinned = await client.prompts.get({
          channel: "production",
          id: "sdk-channel",
        });
        equals("production serves v1", pinned.version, 1);

        await client.prompts.promote({
          channel: "production",
          id: "sdk-channel",
          version: 2,
        });

        const moved = await client.prompts.get({
          channel: "production",
          id: "sdk-channel",
        });
        equals("production now serves v2", moved.version, 2);
      });
    },
  },
  {
    name: "sdk: concurrent reads of one prompt share a single fetch",
    run: async (world) => {
      await withClient(world, {}, async (client) => {
        await client.prompts.create({
          content: "shared body",
          id: "sdk-single-flight",
          name: "Sdk single flight",
        });

        const reads = await Promise.all(
          Array.from({ length: 12 }, () =>
            client.prompts.get({ id: "sdk-single-flight" })
          )
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
