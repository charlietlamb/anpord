import { afterAll, describe, expect, it } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ResolvedCredential } from "@sphynx/schema/domain/credentials";
import { ConfigProvider, Effect, Option, Redacted } from "effect";
import { binPath } from "../../../src/adapters/harness/install";
import { jsonDriver, keyAs } from "../../../src/adapters/harness/json-driver";
import { makeLocalAdapter } from "../../../src/adapters/sandbox/local";
import { runCommandForOutcome } from "../../../src/adapters/sandbox/run-command";

const roots: string[] = [];

afterAll(() =>
  Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })))
);

const freshRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), "sphynx-concurrent-"));
  roots.push(root);
  return root;
};

const racyInstall = (log: string) =>
  [
    "mkdir -p ~/.local/bin",
    '&& { mkdir ~/.local/.busy || { echo "ENOTEMPTY: another install owns this prefix" >&2; exit 190; }; }',
    `&& echo installed >> ${log}`,
    "&& sleep 0.5",
    "&& printf '#!/bin/sh\\necho ran\\n' > ~/.local/bin/fake",
    "&& chmod +x ~/.local/bin/fake",
    "&& rmdir ~/.local/.busy",
  ].join(" ");

const credential = Redacted.make({
  authMethodId: "api-key",
  integrationId: "gemini",
  values: { apiKey: "key" },
} as unknown as ResolvedCredential);

const inLocalRoot = (root: string) =>
  Effect.withConfigProvider(
    ConfigProvider.fromMap(
      new Map([
        ["SPHYNX_LOCAL_SANDBOX", "true"],
        ["SPHYNX_LOCAL_ROOT", join(root, "store")],
      ])
    ).pipe(ConfigProvider.orElse(() => ConfigProvider.fromEnv()))
  );

const openSandbox = (root: string, cache?: string) =>
  Effect.gen(function* () {
    const adapter = yield* makeLocalAdapter;

    return yield* adapter.open({
      autoStopMinutes: 1,
      cache,
      provider: "local",
      workspace: join(root, "work"),
    });
  }).pipe(inLocalRoot(root));

const prepareOne = (root: string) =>
  Effect.gen(function* () {
    const sandbox = yield* openSandbox(root);
    const driver = jsonDriver("gemini", {
      command: () => "true",
      decode: () => ({}),
      install: () => ({
        command: racyInstall(join(root, "installs.log")),
        timeoutMs: 10_000,
      }),
      material: keyAs("FAKE_API_KEY"),
    });

    yield* driver.prepare({
      credential,
      home: sandbox.home,
      profile: Option.none(),
      sandbox,
      version: "1.0.0",
    });

    const bin = binPath(
      { harness: "gemini", harnessVersion: "1.0.0", sandbox },
      "fake"
    );
    const ran = yield* runCommandForOutcome(sandbox, bin);

    return { home: sandbox.home, ran: ran.stdout.trim() };
  });

const installsLogged = async (root: string) =>
  (await readFile(join(root, "installs.log"), "utf8")).trim().split("\n")
    .length;

describe("concurrent local sandboxes", () => {
  it("each get their own home and a working harness", async () => {
    const root = await freshRoot();

    const [first, second] = await Effect.runPromise(
      Effect.all([prepareOne(root), prepareOne(root)], {
        concurrency: "unbounded",
      })
    );

    expect([first.ran, second.ran]).toEqual(["ran", "ran"]);
    expect(first.home).not.toBe(second.home);
  });

  it("install a harness version once and reuse it", async () => {
    const root = await freshRoot();

    await Effect.runPromise(prepareOne(root));
    const again = await Effect.runPromise(prepareOne(root));

    expect(again.ran).toBe("ran");
    expect(await installsLogged(root)).toBe(1);
  });

  it("keep one whole cache entry when two save the same key", async () => {
    const root = await freshRoot();
    const source = async (name: string) => {
      const dir = join(root, name);
      await mkdir(dir, { recursive: true });
      await Promise.all(
        Array.from({ length: 200 }, (_, index) =>
          writeFile(join(dir, `${name}-${index}`), name)
        )
      );
      return dir;
    };
    const [left, right] = await Promise.all([source("left"), source("right")]);

    const openCache = openSandbox(root, "shared").pipe(
      Effect.map((sandbox) => Option.getOrThrow(sandbox.cache))
    );
    const restored = join(root, "restored");

    await Effect.runPromise(
      Effect.gen(function* () {
        const [one, two] = yield* Effect.all([openCache, openCache]);

        yield* Effect.all([one.save("key", left), two.save("key", right)], {
          concurrency: "unbounded",
        });
        yield* (yield* openCache).restore("key", restored);
      })
    );

    const files = await readdir(restored);

    expect(files.length).toBe(200);
    expect(new Set(files.map((file) => file.split("-")[0])).size).toBe(1);
  });
});
