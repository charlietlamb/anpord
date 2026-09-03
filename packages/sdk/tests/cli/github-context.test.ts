import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeContext } from "@effect/platform-node";
import { ConfigProvider, Effect, Option, Redacted } from "effect";
import { githubContext } from "../../src/cli/github-context";

let workspace: string | undefined;

afterEach(async () => {
  if (workspace !== undefined) {
    await rm(workspace, { force: true, recursive: true });
    workspace = undefined;
  }
});

const eventFile = async (body: string) => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-event-"));
  const path = join(workspace, "event.json");
  await writeFile(path, body);
  return path;
};

const resolved = (variables: Record<string, string>) => {
  const written: string[] = [];
  const write = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: string) => {
    written.push(chunk);
    return true;
  }) as typeof process.stderr.write;

  return Effect.runPromise(
    githubContext.pipe(
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map(Object.entries(variables)))
      ),
      Effect.provide(NodeContext.layer),
      Effect.ensuring(
        Effect.sync(() => {
          process.stderr.write = write;
        })
      ),
      Effect.map((context) => ({ context, stderr: written.join("") }))
    )
  );
};

const PUSH: Record<string, string> = {
  GITHUB_REPOSITORY: "acme/widgets",
  GITHUB_SHA: "abc123",
  GITHUB_TOKEN: "ghs_secret",
};

describe("finding the job a check belongs to", () => {
  test("a push carries the token, repository and sha through", async () => {
    const { context } = await resolved(PUSH);

    expect(Option.isSome(context)).toBe(true);
    if (Option.isSome(context)) {
      expect(context.value.repository).toBe("acme/widgets");
      expect(context.value.sha).toBe("abc123");
      expect(Redacted.value(context.value.token)).toBe("ghs_secret");
    }
  });

  test("is nothing when any of the three is missing or empty", async () => {
    for (const name of Object.keys(PUSH)) {
      const { [name]: _dropped, ...without } = PUSH;
      const { context: absent } = await resolved(without);
      const { context: empty } = await resolved({ ...PUSH, [name]: "  " });

      expect(Option.isNone(absent)).toBe(true);
      expect(Option.isNone(empty)).toBe(true);
    }
  });

  test("a pull request takes the head sha from the event file", async () => {
    const path = await eventFile(
      JSON.stringify({ pull_request: { head: { sha: "head456" } } })
    );
    const { context, stderr } = await resolved({
      ...PUSH,
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_EVENT_PATH: path,
    });

    expect(Option.map(context, (found) => found.sha)).toEqual(
      Option.some("head456")
    );
    expect(stderr).toBe("");
  });

  test("falls back to GITHUB_SHA with a note when the event is unreadable", async () => {
    const path = await eventFile("not json");
    const { context, stderr } = await resolved({
      ...PUSH,
      GITHUB_EVENT_NAME: "pull_request_target",
      GITHUB_EVENT_PATH: path,
    });

    expect(Option.map(context, (found) => found.sha)).toEqual(
      Option.some("abc123")
    );
    expect(stderr).toContain("GITHUB_SHA");
  });

  test("falls back when the event file is missing", async () => {
    const { context } = await resolved({
      ...PUSH,
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_EVENT_PATH: join(tmpdir(), "anpord-no-such-event.json"),
    });

    expect(Option.map(context, (found) => found.sha)).toEqual(
      Option.some("abc123")
    );
  });

  test("stays quiet without a token, whatever the event file holds", async () => {
    const { context, stderr } = await resolved({
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_EVENT_PATH: join(tmpdir(), "anpord-no-such-event.json"),
      GITHUB_REPOSITORY: "acme/widgets",
      GITHUB_SHA: "abc123",
    });

    expect(Option.isNone(context)).toBe(true);
    expect(stderr).toBe("");
  });
});
