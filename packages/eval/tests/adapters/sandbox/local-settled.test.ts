import { afterAll, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigProvider, Effect } from "effect";
import { makeLocalAdapter } from "../../../src/adapters/sandbox/local";
import { runLongCommand } from "../../../src/services/long-command";
import { SuspenderSleeping } from "../../../src/services/suspender";

const roots: string[] = [];

afterAll(() =>
  Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })))
);

const inLocalRoot = (root: string) =>
  Effect.withConfigProvider(
    ConfigProvider.fromMap(
      new Map([
        ["ANPORD_LOCAL_SANDBOX", "true"],
        ["ANPORD_LOCAL_ROOT", join(root, "store")],
      ])
    ).pipe(ConfigProvider.orElse(() => ConfigProvider.fromEnv()))
  );

const timedLongCommand = async (command: string) => {
  const root = await mkdtemp(join(tmpdir(), "anpord-settled-"));
  roots.push(root);

  return Effect.gen(function* () {
    const adapter = yield* makeLocalAdapter;
    const sandbox = yield* adapter.open({
      autoStopMinutes: 1,
      provider: "local",
      workspace: join(root, "work"),
    });
    const began = performance.now();
    const outcome = yield* runLongCommand(sandbox, command);

    return { ms: performance.now() - began, outcome };
  }).pipe(
    Effect.provide(SuspenderSleeping),
    inLocalRoot(root),
    Effect.runPromise
  );
};

describe("a long command on the local sandbox", () => {
  it("reports as soon as the command exits, not at the next check", async () => {
    const { ms, outcome } = await timedLongCommand("sleep 0.7; echo done");

    expect(outcome).toEqual({ exitCode: 0, stderr: "", stdout: "done\n" });
    expect(ms).toBeLessThan(3000);
  });

  it("reports a quick failure with its exit code", async () => {
    const { ms, outcome } = await timedLongCommand("echo broke >&2; exit 3");

    expect(outcome).toEqual({ exitCode: 3, stderr: "broke\n", stdout: "" });
    expect(ms).toBeLessThan(3000);
  });
});
