import { afterEach, describe, expect, test } from "bun:test";
import { spawnUntilReady } from "../src/stack/child";
import { runThenTeardown } from "../src/stack/paired";

const servers: ReturnType<typeof Bun.serve>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.stop(true)));
});

const slowOk = () => {
  const server = Bun.serve({
    port: 0,
    fetch: async () => {
      await Bun.sleep(300);
      return new Response("ok");
    },
  });
  servers.push(server);
  return `http://127.0.0.1:${server.port}/`;
};

const childOptions = (command: string, readyUrl: string) => ({
  args: [],
  command,
  cwd: process.cwd(),
  env: {},
  failure: "child never became ready",
  ready: (status: number) => status === 200,
  readyUrl,
  timeoutMs: 2000,
});

describe("spawnUntilReady", () => {
  test("fails with its message when the command cannot be spawned", async () => {
    const outcome = await spawnUntilReady(
      childOptions("/definitely/not/a/command", slowOk())
    ).catch((error: Error) => error.message);
    expect(outcome).toStartWith("child never became ready:\n");
  });

  test("fails when the child exits before a probe answers ready", async () => {
    const outcome = await spawnUntilReady(childOptions("true", slowOk())).catch(
      (error: Error) => error.message
    );
    expect(outcome).toBe("child never became ready:\n");
  });
});

describe("runThenTeardown", () => {
  test("reports both the use failure and the teardown failure", async () => {
    const outcome = await runThenTeardown(
      () => Promise.reject(new Error("use failed")),
      () => Promise.reject(new Error("teardown failed"))
    ).catch((error: AggregateError) =>
      error.errors.map((cause: Error) => cause.message)
    );
    expect(outcome).toEqual(["use failed", "teardown failed"]);
  });

  test("returns the result after tearing down", async () => {
    const seen: string[] = [];
    const result = await runThenTeardown(
      () => Promise.resolve("used"),
      () => {
        seen.push("torn down");
        return Promise.resolve();
      }
    );
    expect([result, ...seen]).toEqual(["used", "torn down"]);
  });
});
