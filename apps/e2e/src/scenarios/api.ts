import { contains, equals, isTrue } from "../harness/expect";
import type { Scenario } from "../harness/run";
import type { World } from "../world";

interface Call {
  readonly body: unknown;
  readonly status: number;
}

const call = async (
  world: World,
  endpoint: string,
  payload: unknown,
  key = world.writeKey.key
): Promise<Call> => {
  const response = await fetch(`${world.baseUrl}/v1/${endpoint}`, {
    body: JSON.stringify(payload),
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  const text = await response.text();

  return {
    body: text.length > 0 ? JSON.parse(text) : null,
    status: response.status,
  };
};

const asPrompt = (body: unknown) =>
  body as {
    readonly version: number;
    readonly content: string;
    readonly id: string;
  };

export const apiScenarios: readonly Scenario<World>[] = [
  {
    name: "api: a key creates, reads back, and versions a prompt",
    run: async (world) => {
      const id = "support-reply";

      const created = await call(world, "prompts.create", {
        content: "You are a support agent for {{product}}.",
        id,
        name: "Support reply",
      });
      equals("create status", created.status, 200);
      equals("first version", asPrompt(created.body).version, 1);

      const read = await call(world, "prompts.get", { id });
      equals("get status", read.status, 200);
      contains(
        "content round trips",
        asPrompt(read.body).content,
        "{{product}}"
      );

      const updated = await call(world, "prompts.update", {
        content: "You are a senior support agent for {{product}}.",
        id,
        message: "warmer tone",
      });
      equals("update status", updated.status, 200);
      equals("second version", asPrompt(updated.body).version, 2);
    },
  },
  {
    name: "api: a key writes without a user row behind it",
    run: async (world) => {
      const id = "attribution-check";

      const created = await call(world, "prompts.create", {
        content: "hello",
        id,
        name: "Attribution check",
      });
      equals("create status", created.status, 200);

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
    name: "api: promoting moves the channel and the read follows it",
    run: async (world) => {
      const id = "release-notes";

      await call(world, "prompts.create", {
        content: "v1 body",
        id,
        name: "Release notes",
        publish: false,
      });
      await call(world, "prompts.update", { content: "v2 body", id });

      const promoted = await call(world, "prompts.promote", {
        channel: "production",
        id,
        version: 1,
      });
      equals("promote status", promoted.status, 200);

      const pinned = await call(world, "prompts.get", {
        channel: "production",
        id,
      });
      equals("production serves v1", asPrompt(pinned.body).version, 1);

      await call(world, "prompts.promote", {
        channel: "production",
        id,
        version: 2,
      });

      const moved = await call(world, "prompts.get", {
        channel: "production",
        id,
      });
      equals("production now serves v2", asPrompt(moved.body).version, 2);
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
      const id = "only-once";

      const first = await call(world, "prompts.create", {
        content: "a",
        id,
        name: "Only once",
      });
      equals("first create", first.status, 200);

      const second = await call(world, "prompts.create", {
        content: "b",
        id,
        name: "Only once again",
      });
      equals("second create conflicts", second.status, 409);

      const rows = await world.query("select id from prompt where id = $1", [
        id,
      ]);
      equals("still one prompt", rows.length, 1);
    },
  },
  {
    name: "api: a key cannot archive, and the guard answers before the write",
    run: async (world) => {
      const id = "guarded";

      await call(world, "prompts.create", {
        content: "keep me",
        id,
        name: "Guarded",
      });

      const archived = await call(world, "prompts.archive", { id });
      equals("archive is refused", archived.status, 403);

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
      const id = "tenant-isolated";

      await call(world, "prompts.create", {
        content: "private to the first tenant",
        id,
        name: "Tenant isolated",
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
