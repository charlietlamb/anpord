import { contains, equals, isTrue } from "../harness/expect";
import { givenPrompt, type PromptShape } from "../harness/given";
import { callApi } from "../harness/http";
import type { Scenario } from "../harness/run";
import type { World } from "../world";

const call = <Body = unknown>(
  world: World,
  endpoint: string,
  payload: unknown,
  key = world.writeKey.key
) => callApi<Body>(world.baseUrl, key, endpoint, payload);

/**
 * An api key is deliberately refused organization:admin, so archiving is
 * driven through the store the dashboard writes to. The scenarios are about
 * what archiving means for readers, not about who is allowed to do it.
 */
const archive = (world: World, id: string) =>
  world.query("update prompt set archived_at = now() where id = $1", [id]);

export const lifecycleScenarios: readonly Scenario<World>[] = [
  {
    name: "lifecycle: an archived prompt keeps serving what was already shipped",
    run: async (world) => {
      const { id } = await givenPrompt(world, "life-archived", {
        content: "the shipped body",
        versions: ["a later draft"],
      });

      await archive(world, id);

      const pinned = await call<PromptShape>(world, "prompts.get", {
        id,
        version: 1,
      });
      equals("a pinned read still answers", pinned.status, 200);
      contains("with what it shipped", pinned.body.content, "shipped");

      const channel = await call<PromptShape>(world, "prompts.get", {
        channel: "production",
        id,
      });
      equals("so does the channel it was on", channel.status, 200);
      equals("serving the same version", channel.body.version, 1);
    },
  },
  {
    name: "lifecycle: archiving hides a prompt from listings and refuses writes",
    run: async (world) => {
      const { id } = await givenPrompt(world, "life-hidden");

      const before = await call<{ data: readonly { id: string }[] }>(
        world,
        "prompts.list",
        {}
      );
      isTrue(
        "listed before archiving",
        before.body.data.some((row) => row.id === id),
        "the prompt was missing before it was archived"
      );

      await archive(world, id);

      const after = await call<{ data: readonly { id: string }[] }>(
        world,
        "prompts.list",
        {}
      );
      isTrue(
        "gone from listings",
        !after.body.data.some((row) => row.id === id),
        "an archived prompt was still listed"
      );

      const written = await call(world, "prompts.update", {
        content: "should not land",
        id,
      });
      equals("a write is refused", written.status, 404);
    },
  },
  {
    name: "lifecycle: an id an archived prompt holds is a conflict, not a crash",
    run: async (world) => {
      const { id } = await givenPrompt(world, "life-recycled");
      await archive(world, id);

      const again = await call(world, "prompts.create", {
        content: "a fresh start",
        id,
        name: "Recycled",
      });

      equals("answers as a conflict", again.status, 409);
      contains("naming the id", JSON.stringify(again.body), id);

      const rows = await world.query("select id from prompt where id = $1", [
        id,
      ]);
      equals("and wrote nothing", rows.length, 1);
    },
  },
  {
    name: "lifecycle: another organization cannot write to a prompt it cannot see",
    run: async (world) => {
      const { id } = await givenPrompt(world, "life-isolated", {
        content: "belongs to the first tenant",
      });

      const foreign = world.otherKey.key;

      const written = await call(
        world,
        "prompts.update",
        { content: "pwned", id },
        foreign
      );
      const promoted = await call(
        world,
        "prompts.promote",
        { channel: "production", id, version: 1 },
        foreign
      );
      const archived = await call(world, "prompts.archive", { id }, foreign);

      equals("update is refused", written.status, 404);
      equals("promote is refused", promoted.status, 404);
      isTrue(
        "archive is refused",
        archived.status === 404 || archived.status === 403,
        `expected a refusal, got ${archived.status}`
      );

      const own = await call<PromptShape>(world, "prompts.get", { id });
      contains("the owner is untouched", own.body.content, "first tenant");

      const rows = await world.query<{ archived_at: Date | null }>(
        "select archived_at from prompt where id = $1",
        [id]
      );
      equals("and still live", rows[0]?.archived_at ?? null, null);
    },
  },
  {
    name: "lifecycle: concurrent writes never share a version number",
    run: async (world) => {
      const { id } = await givenPrompt(world, "life-race");

      const attempts = 8;
      const results = await Promise.all(
        Array.from({ length: attempts }, (_unused, index) =>
          call<PromptShape>(world, "prompts.update", {
            content: `racing body ${index}`,
            id,
          })
        )
      );

      const written = results.filter((result) => result.status === 200);
      const versions = written.map((result) => result.body.version);

      isTrue(
        "every call was answered",
        results.every(
          (result) => result.status === 200 || result.status === 409
        ),
        `unexpected statuses: ${results.map((r) => r.status).join(", ")}`
      );
      equals(
        "no two writes claimed one number",
        new Set(versions).size,
        versions.length
      );

      const stored = await world.query<{ version: number }>(
        `select v.version
           from prompt_version v
           join prompt p on p.internal_id = v.prompt_internal_id
          where p.id = $1
          order by v.version`,
        [id]
      );

      isTrue(
        "the retry absorbed the contention",
        written.length === attempts,
        `only ${written.length} of ${attempts} writes landed; the rest gave up`
      );

      /* Compared against the sequence it should be rather than counted: a
         history of 1,2,3,5,8 has the right length and the wrong contents. */
      equals(
        "the history runs unbroken",
        stored.map((row) => row.version).join(","),
        Array.from({ length: stored.length }, (_row, index) => index + 1).join(
          ","
        )
      );
    },
  },
];
