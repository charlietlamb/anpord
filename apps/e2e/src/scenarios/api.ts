import { contains, equals, isTrue } from "../harness/expect";
import { givenPrompt, type PromptShape } from "../harness/given";
import { callApi } from "../harness/http";
import type { Scenario } from "../harness/run";
import { rollback } from "../harness/surface";
import type { World } from "../world";

const call = <Body = unknown>(
  world: World,
  endpoint: string,
  payload: unknown,
  key = world.writeKey.key
) => callApi<Body>(world.baseUrl, key, endpoint, payload);

/** The surface under test, expressed as the operations every surface shares,
 * so a behaviour proved here can be proved identically elsewhere. */
const apiSurface = (world: World) => ({
  get: async (id: string, selector?: { readonly channel?: string }) =>
    (await call<PromptShape>(world, "prompts.get", { id, ...selector })).body,
  promote: async (id: string, channel: string, version: number) => {
    await call(world, "prompts.promote", { channel, id, version });
  },
  update: async (id: string, content: string) =>
    (await call<PromptShape>(world, "prompts.update", { content, id })).body
      .version,
});

export const apiScenarios: readonly Scenario<World>[] = [
  {
    name: "api: a key creates, reads back, and versions a prompt",
    run: async (world) => {
      const { id } = await givenPrompt(world, "api-versions", {
        content: "You are a support agent for {{product}}.",
      });

      const read = await call<PromptShape>(world, "prompts.get", { id });
      equals("get status", read.status, 200);
      contains("content round trips", read.body.content, "{{product}}");

      const updated = await call<PromptShape>(world, "prompts.update", {
        content: "You are a senior support agent for {{product}}.",
        id,
        message: "warmer tone",
      });
      equals("update status", updated.status, 200);
      equals("second version", updated.body.version, 2);
    },
  },
  {
    name: "api: a key writes without a user row behind it",
    run: async (world) => {
      const { id } = await givenPrompt(world, "api-attribution");

      const authored = await world.query<{ created_by: string | null }>(
        `select v.created_by
           from prompt_version v
           join prompt p on p.internal_id = v.prompt_internal_id
          where p.id = $1`,
        [id]
      );

      equals("one version stored", authored.length, 1);
      equals("author is absent", authored[0]?.created_by ?? null, null);
    },
  },
  {
    name: "api: a channel can be pointed forwards and rolled back",
    run: async (world) => {
      const { id } = await givenPrompt(world, "api-rollback", {
        content: "v1 body",
        versions: ["v2 body"],
      });

      await rollback(apiSurface(world), id, 2, 1);
    },
  },
  {
    name: "api: a missing prompt answers 404 with a body",
    run: async (world) => {
      const missing = await call(world, "prompts.get", { id: "not-a-prompt" });

      equals("status", missing.status, 404);
      isTrue(
        "carries a reason",
        typeof (missing.body as { message?: string })?.message === "string",
        `expected a message, got ${JSON.stringify(missing.body)}`
      );
    },
  },
  {
    name: "api: a duplicate id is a conflict, not a second prompt",
    run: async (world) => {
      const { id } = await givenPrompt(world, "api-duplicate");

      const second = await call(world, "prompts.create", {
        content: "b",
        id,
        name: "Duplicate",
      });
      equals("second create conflicts", second.status, 409);

      const rows = await world.query("select id from prompt where id = $1", [
        id,
      ]);
      equals("still one prompt", rows.length, 1);
    },
  },
  {
    /* Archiving is a dashboard action rather than an API one, so the public
       surface does not carry it at all. The answer is 404 rather than 403
       because there is no route to be forbidden from, and what matters to a
       caller either way is that the prompt is still there afterwards. */
    name: "api: a key cannot archive, and the prompt survives the attempt",
    run: async (world) => {
      const { id } = await givenPrompt(world, "api-guarded");

      const archived = await call(world, "prompts.archive", { id });
      equals("archive is not offered", archived.status, 404);

      const rows = await world.query<{ archived_at: Date | null }>(
        "select archived_at from prompt where id = $1",
        [id]
      );
      equals("prompt is untouched", rows[0]?.archived_at ?? null, null);
    },
  },
  {
    name: "api: a bad key is rejected before any handler runs",
    run: async (world) => {
      const refused = await call(
        world,
        "prompts.list",
        {},
        "anpord_not_a_real_key"
      );

      equals("status", refused.status, 401);
    },
  },
  {
    name: "api: one organization cannot read another's prompts",
    run: async (world) => {
      const { id } = await givenPrompt(world, "api-isolated", {
        content: "private to the first tenant",
      });

      const foreign = await call(
        world,
        "prompts.get",
        { id },
        world.otherKey.key
      );
      equals("the other tenant sees nothing", foreign.status, 404);

      const own = await call(world, "prompts.get", { id });
      equals("the owner still reads it", own.status, 200);
    },
  },
];
