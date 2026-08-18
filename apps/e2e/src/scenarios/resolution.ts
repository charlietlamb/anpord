import { contains, equals, isTrue } from "../harness/expect";
import { givenPrompt, type PromptShape } from "../harness/given";
import { callApi } from "../harness/http";
import type { Scenario } from "../harness/run";
import type { World } from "../world";

const call = <Body = unknown>(
  world: World,
  endpoint: string,
  payload: unknown
) => callApi<Body>(world.baseUrl, world.writeKey.key, endpoint, payload);

const messageOf = (body: unknown) =>
  (body as { message?: string }).message ?? "";

/**
 * Which version a caller receives when they name a channel, a version, a
 * derived name, or nothing at all. Every one of these is a different path
 * through resolution, and the wrong answer is silent: the caller still gets a
 * prompt, just not the one they shipped.
 */
export const resolutionScenarios: readonly Scenario<World>[] = [
  {
    name: "resolution: latest reads the newest version rather than a channel",
    run: async (world) => {
      const { id } = await givenPrompt(world, "res-latest", {
        content: "first",
        versions: ["second", "third"],
      });

      const latest = await call<PromptShape>(world, "prompts.get", {
        channel: "latest",
        id,
      });

      equals("status", latest.status, 200);
      equals("serves the newest version", latest.body.version, 3);
      contains("with its content", latest.body.content, "third");
      equals("answers as latest", latest.body.channel ?? null, "latest");

      const production = await call<PromptShape>(world, "prompts.get", {
        channel: "production",
        id,
      });
      equals("production has not moved", production.body.version, 1);
    },
  },
  {
    name: "resolution: latest follows a new version without being promoted",
    run: async (world) => {
      const { id } = await givenPrompt(world, "res-latest-follows");

      const before = await call<PromptShape>(world, "prompts.get", {
        channel: "latest",
        id,
      });
      equals("starts at the first version", before.body.version, 1);

      await call(world, "prompts.update", { content: "a newer body", id });

      const after = await call<PromptShape>(world, "prompts.get", {
        channel: "latest",
        id,
      });
      equals("moves on its own", after.body.version, 2);
      contains("to the new body", after.body.content, "newer");
    },
  },
  {
    name: "resolution: naming nothing serves what is live, not the newest draft",
    run: async (world) => {
      const { id } = await givenPrompt(world, "res-default", {
        content: "the live body",
        versions: ["an unreviewed draft"],
      });

      const bare = await call<PromptShape>(world, "prompts.get", { id });

      equals("status", bare.status, 200);
      equals("serves the live version", bare.body.version, 1);
      contains("with the live body", bare.body.content, "live");
      equals(
        "answering as production",
        bare.body.channel ?? null,
        "production"
      );
    },
  },
  {
    name: "resolution: the organization's default channel answers a bare read",
    run: async (world) => {
      const { id } = await givenPrompt(world, "res-default-channel", {
        content: "the production body",
        versions: ["the staging body"],
      });

      await call(world, "prompts.promote", {
        channel: "staging",
        id,
        version: 2,
      });

      await world.query(
        `update channel set is_default = true
          where name = 'staging' and organization_id = (
            select organization_id from prompt where id = $1
          )`,
        [id]
      );

      const bare = await call<PromptShape>(world, "prompts.get", { id });

      equals("the default takes over", bare.body.version, 2);
      equals("and says which answered", bare.body.channel ?? null, "staging");

      await world.query(
        "update channel set is_default = false where name = 'staging'"
      );
    },
  },
  {
    name: "resolution: a pinned version ignores whatever a channel points at",
    run: async (world) => {
      const { id } = await givenPrompt(world, "res-pinned", {
        content: "the first body",
        versions: ["the second body"],
        promote: { channel: "production", version: 2 },
      });

      const pinned = await call<PromptShape>(world, "prompts.get", {
        id,
        version: 1,
      });

      equals("serves what was asked for", pinned.body.version, 1);
      contains("with its own content", pinned.body.content, "first");
      equals("and names no channel", pinned.body.channel ?? null, null);
    },
  },
  {
    name: "resolution: each kind of miss says which kind it was",
    run: async (world) => {
      const { id } = await givenPrompt(world, "res-misses");

      const version = await call(world, "prompts.get", { id, version: 99 });
      equals("a missing version is 404", version.status, 404);
      contains("named as a version", messageOf(version.body), "Version 99");

      const channel = await call(world, "prompts.get", {
        channel: "nowhere",
        id,
      });
      equals("a missing channel is 404", channel.status, 404);
      contains("named as a channel", messageOf(channel.body), "nowhere");

      const prompt = await call(world, "prompts.get", { id: "not-a-prompt" });
      equals("a missing prompt is 404", prompt.status, 404);
      contains("named as a prompt", messageOf(prompt.body), "not-a-prompt");

      isTrue(
        "the three read differently",
        new Set([
          messageOf(version.body),
          messageOf(channel.body),
          messageOf(prompt.body),
        ]).size === 3,
        "two misses gave the same message"
      );
    },
  },
];
