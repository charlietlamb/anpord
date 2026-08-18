import { contains, equals, isTrue } from "../harness/expect";
import { givenPrompt } from "../harness/given";
import { callApi } from "../harness/http";
import type { Scenario } from "../harness/run";
import type { World } from "../world";

const CONTENT_MAX = 256 * 1024;

const call = (world: World, endpoint: string, payload: unknown) =>
  callApi(world.baseUrl, world.writeKey.key, endpoint, payload);

const rejected = async (
  world: World,
  check: string,
  endpoint: string,
  payload: unknown
) => {
  const { body, status } = await call(world, endpoint, payload);

  equals(check, status, 400);
  isTrue(
    `${check} says what was wrong`,
    JSON.stringify(body).length > 2,
    "a rejection came back with nothing to read"
  );
};

/**
 * The edge is where a bad request should stop. Rejecting late means a caller
 * is told the connection dropped rather than which field was wrong, and it
 * means the store is the thing enforcing the rule.
 */
export const validationScenarios: readonly Scenario<World>[] = [
  {
    name: "validation: an id has to be one a url and a filesystem can carry",
    run: async (world) => {
      await rejected(world, "uppercase is refused", "prompts.create", {
        content: "c",
        id: "NotLowercase",
        name: "x",
      });
      await rejected(world, "a space is refused", "prompts.create", {
        content: "c",
        id: "has a space",
        name: "x",
      });
      await rejected(world, "a leading dash is refused", "prompts.create", {
        content: "c",
        id: "-leading",
        name: "x",
      });
    },
  },
  {
    name: "validation: content is bounded, and the caller is told which field",
    run: async (world) => {
      await rejected(world, "empty content is refused", "prompts.create", {
        content: "",
        id: "val-empty",
        name: "x",
      });

      const { body, status } = await call(world, "prompts.create", {
        content: "z".repeat(CONTENT_MAX + 1),
        id: "val-huge",
        name: "x",
      });

      equals("oversized content is refused", status, 400);
      contains("naming the limit", JSON.stringify(body), "256 KB");
    },
  },
  {
    name: "validation: a channel name is stricter than a prompt id",
    run: async (world) => {
      const { id } = await givenPrompt(world, "val-channel");

      const slashed = await call(world, "prompts.create", {
        content: "c",
        id: "with/a/slash",
        name: "x",
      });
      equals("a prompt id may carry a slash", slashed.status, 200);

      await rejected(world, "a channel may not", "prompts.promote", {
        channel: "with/a/slash",
        id,
        version: 1,
      });
    },
  },
  {
    name: "validation: a version has to be a positive whole number",
    run: async (world) => {
      const { id } = await givenPrompt(world, "val-version");

      await rejected(world, "zero is refused", "prompts.promote", {
        channel: "production",
        id,
        version: 0,
      });
      await rejected(world, "a negative is refused", "prompts.promote", {
        channel: "production",
        id,
        version: -1,
      });
      await rejected(world, "a fraction is refused", "prompts.get", {
        id,
        version: 1.5,
      });
    },
  },
  {
    name: "validation: promoting to a version that does not exist moves nothing",
    run: async (world) => {
      const { id } = await givenPrompt(world, "val-promote-missing", {
        content: "the live body",
      });

      const promoted = await call(world, "prompts.promote", {
        channel: "production",
        id,
        version: 99,
      });

      equals("answers as missing", promoted.status, 404);
      contains("naming the version", JSON.stringify(promoted.body), "99");

      const served = await callApi<{ readonly version: number }>(
        world.baseUrl,
        world.writeKey.key,
        "prompts.get",
        { channel: "production", id }
      );
      equals("the channel has not moved", served.body.version, 1);
    },
  },
];
