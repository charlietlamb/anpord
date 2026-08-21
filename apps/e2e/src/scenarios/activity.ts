import { contains, equals, isTrue } from "../harness/expect";
import { givenPrompt } from "../harness/given";
import { callApi } from "../harness/http";
import { callInternal } from "../harness/internal";
import type { Scenario } from "../harness/run";
import type { World } from "../world";

interface Deployment {
  readonly channel: string;
  readonly from: number | null;
  readonly id: string;
  readonly move: string;
  readonly promptId: string;
  readonly to: number | null;
}

interface DeploymentPage {
  readonly items: readonly Deployment[];
  readonly nextCursor: string | null;
}

const promote = (world: World, id: string, version: number) =>
  callApi(world.baseUrl, world.writeKey.key, "prompts.promote", {
    channel: "production",
    id,
    version,
  });

const deployments = (world: World, query = "") =>
  callInternal<DeploymentPage>(
    world.baseUrl,
    world.sessionToken,
    "GET",
    `/activity?kind=deployed${query.replace("?", "&")}`
  );

/**
 * The record a team reads after a bad deploy. Nothing else tells them what
 * moved, when, or what it moved from, so a classification that quietly calls a
 * rollback a promotion is worse than no log at all.
 */
export const activityScenarios: readonly Scenario<World>[] = [
  {
    name: "deployments: the log says what moved and which way it went",
    run: async (world) => {
      const { id } = await givenPrompt(world, "dep-kinds", {
        content: "v1",
        versions: ["v2"],
      });

      await promote(world, id, 2);
      await promote(world, id, 1);
      await promote(world, id, 1);

      const page = await deployments(world, `?prompt=${id}`);
      equals("status", page.status, 200);

      const kinds = page.body.items.map((item) => item.move);
      const moves = page.body.items.map(
        (item) => `${item.from ?? "-"}->${item.to}`
      );

      equals("one entry per move", kinds.length, 4);
      equals(
        "newest first, and each named for what it did",
        kinds.join(","),
        "repeat,rollback,promotion,first"
      );
      equals(
        "each carrying where it came from",
        moves.join(","),
        "1->1,2->1,1->2,-->1"
      );
    },
  },
  {
    name: "deployments: paging visits every entry exactly once",
    run: async (world) => {
      const { id } = await givenPrompt(world, "dep-paging", {
        content: "v1",
        versions: ["v2", "v3"],
      });

      for (const version of [2, 3, 1, 2, 3, 1]) {
        await promote(world, id, version);
      }

      const all = await deployments(world, `?prompt=${id}&limit=100`);
      const expected = all.body.items.map((item) => item.id);
      isTrue(
        "there is something to page through",
        expected.length >= 7,
        `only ${expected.length} deployments were recorded`
      );

      const seen: string[] = [];
      let cursor: string | null = null;

      do {
        const query: string = cursor
          ? `?prompt=${id}&limit=3&cursor=${encodeURIComponent(cursor)}`
          : `?prompt=${id}&limit=3`;
        const page = await deployments(world, query);

        equals("each page answers", page.status, 200);
        seen.push(...page.body.items.map((item) => item.id));
        cursor = page.body.nextCursor;
      } while (cursor !== null && seen.length <= expected.length);

      equals("every entry was visited", seen.length, expected.length);
      equals("none of them twice", new Set(seen).size, seen.length);
      equals("and in the same order", seen.join(","), expected.join(","));
    },
  },
  {
    name: "deployments: one organization's log never shows another's moves",
    run: async (world) => {
      const { id } = await givenPrompt(world, "dep-isolated", {
        content: "v1",
        versions: ["v2"],
      });
      await promote(world, id, 2);

      const foreign = await callInternal<DeploymentPage>(
        world.baseUrl,
        world.otherSessionToken,
        "GET",
        "/activity?kind=deployed&limit=100"
      );

      equals("the other tenant is answered", foreign.status, 200);
      isTrue(
        "but sees none of these moves",
        foreign.body.items.every((item) => item.promptId !== id),
        "a deployment leaked across organizations"
      );
    },
  },
  {
    name: "deployments: a session is required, a key is not enough",
    run: async (world) => {
      const withoutSession = await fetch(`${world.baseUrl}/api/activity`, {
        headers: { authorization: `Bearer ${world.writeKey.key}` },
      });

      isTrue(
        "an api key is refused",
        withoutSession.status === 401 || withoutSession.status === 403,
        `expected a refusal, got ${withoutSession.status}`
      );

      const withSession = await deployments(world, "?limit=1");
      equals("a session is accepted", withSession.status, 200);
    },
  },
  {
    name: "deployments: promoting to latest is refused rather than silently lost",
    run: async (world) => {
      const { id } = await givenPrompt(world, "dep-latest", {
        content: "v1",
        versions: ["v2", "v3"],
      });

      const promoted = await callApi(
        world.baseUrl,
        world.writeKey.key,
        "prompts.promote",
        { channel: "latest", id, version: 1 }
      );

      equals("answers as a conflict", promoted.status, 409);
      contains("naming the channel", JSON.stringify(promoted.body), "latest");

      const stored = await world.query(
        "select name from channel where name = $1",
        ["latest"]
      );
      equals("and stores no channel by that name", stored.length, 0);

      const read = await callApi<{ readonly version: number }>(
        world.baseUrl,
        world.writeKey.key,
        "prompts.get",
        { channel: "latest", id }
      );
      equals("latest still reads the newest", read.body.version, 3);
    },
  },
];
