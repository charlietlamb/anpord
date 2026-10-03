import { describe, expect, test } from "bun:test";
import type { ResolvedCredential } from "@sphynx/schema/domain/credentials";
import { Effect, Redacted, Stream } from "effect";
import type { RequestedProfile } from "../../src/domain/harness-profile";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { SuspenderSleeping } from "../../src/services/suspender";
import { prepareWorkspace } from "../../src/services/workspace";
import { declinesEverything } from "../fixtures/declines-everything";

const HOME = "/home/agent";
const WORKSPACE = "/tmp/ws";

const recording = () => {
  const steps: string[] = [];

  const sandbox: SandboxHandle = {
    exec: (command) => {
      steps.push(`exec ${command}`);

      return Stream.fromIterable<ExecChunk>([
        { at: 0, exitCode: 0, stream: "exit" },
      ]);
    },
    home: HOME,
    id: "test",
    provider: "daytona",
    ...declinesEverything,
    writeFile: (path) =>
      Effect.sync(() => {
        steps.push(`write ${path}`);
      }),
  };

  return { sandbox, steps };
};

const profile: RequestedProfile = {
  env: { PROFILE_ONLY: "yes", SHARED: "profile" },
  files: {
    "home/.config/opencode/opencode.json": "{}",
    "home/.config/opencode/plugin/turn.js": "export default {}",
    "workspace/AGENTS.md": "# sample",
    "workspace/skills/one/SKILL.md": "sample",
  },
  install: null,
  name: "sample",
  run: null,
  systemPrompt: "Answer in one word.",
  variables: null,
};

const credential = (values: Readonly<Record<string, string>>) =>
  Redacted.make<ResolvedCredential>({
    authMethodId: "env",
    connectionId: "env-1",
    integrationId: "env",
    revision: 1,
    values,
  });

const prepare = (
  sandbox: SandboxHandle,
  overrides: Partial<Parameters<typeof prepareWorkspace>[0]> = {}
) =>
  prepareWorkspace({
    credential: credential({}),
    driver: {
      prepare: () =>
        Effect.sync(() => ({ DRIVER_ONLY: "yes", SHARED: "driver" })),
    } as never,
    forwarded: {},
    harness: "opencode" as never,
    harnessVersion: "1",
    home: HOME,
    model: "vendor/model",
    prepare: null,
    profile,
    sandbox,
    secrets: [],
    source: { kind: "repo", ref: null, url: "https://example.test/repo.git" },
    workspace: WORKSPACE,
    ...overrides,
  }).pipe(Effect.provide(SuspenderSleeping), Effect.scoped);

const indexOf = (steps: readonly string[], fragment: string) =>
  steps.findIndex((step) => step.includes(fragment));

describe("a profile materialised around the workspace", () => {
  test("writes home files after the driver's prepare and before the clone", async () => {
    const { sandbox, steps } = recording();

    await Effect.runPromise(prepare(sandbox));

    expect(
      indexOf(steps, `write ${HOME}/.config/opencode/opencode.json`)
    ).toBeLessThan(indexOf(steps, "clone"));
    expect(
      indexOf(steps, `write ${HOME}/.sphynx/system-prompt.md`)
    ).toBeLessThan(indexOf(steps, "clone"));
  });

  test("writes workspace files after the clone, which needs an empty directory", async () => {
    const { sandbox, steps } = recording();

    await Effect.runPromise(prepare(sandbox));

    expect(indexOf(steps, `write ${WORKSPACE}/AGENTS.md`)).toBeGreaterThan(
      indexOf(steps, "clone")
    );
    expect(
      indexOf(steps, `write ${WORKSPACE}/skills/one/SKILL.md`)
    ).toBeGreaterThan(indexOf(steps, "clone"));
  });

  test("makes every parent of a stage in one command", async () => {
    const { sandbox, steps } = recording();

    await Effect.runPromise(prepare(sandbox));

    const mkdirs = steps.filter((step) => step.startsWith("exec mkdir -p"));

    expect(mkdirs).toEqual([
      `exec mkdir -p ${WORKSPACE}`,
      `exec mkdir -p '${HOME}/.config/opencode' '${HOME}/.config/opencode/plugin' '${HOME}/.sphynx'`,
      `exec mkdir -p '${WORKSPACE}' '${WORKSPACE}/skills/one'`,
    ]);
  });

  test("writes nothing of its own when the cell has no profile", async () => {
    const { sandbox, steps } = recording();

    await Effect.runPromise(prepare(sandbox, { profile: null }));

    expect(steps.some((step) => step.startsWith("write"))).toBe(false);
  });

  test("installs after both stages, on a base that is not the command harness", async () => {
    const { sandbox, steps } = recording();

    await Effect.runPromise(
      prepare(sandbox, {
        profile: { ...profile, install: "npx skills add sample/skills" },
      })
    );

    const install = steps.findIndex((step) =>
      step.includes("npx skills add sample/skills")
    );

    expect(install).toBeGreaterThan(
      indexOf(steps, `write ${WORKSPACE}/AGENTS.md`)
    );
    expect(install).toBeGreaterThan(
      indexOf(steps, `write ${HOME}/.config/opencode/opencode.json`)
    );
  });
});

describe("the environment a profile cell runs under", () => {
  const envOf = (overrides: Partial<Parameters<typeof prepareWorkspace>[0]>) =>
    Effect.runPromise(prepare(recording().sandbox, overrides)).then(
      (result) => result.env
    );

  test("names the sandbox so a profile's own scripts can find it", async () => {
    expect(await envOf({})).toMatchObject({
      SPHYNX_HOME: HOME,
      SPHYNX_MODEL: "vendor/model",
      SPHYNX_WORKSPACE: WORKSPACE,
    });
  });

  test("lets the profile override what the driver's prepare returned", async () => {
    const env = await envOf({});

    expect(env.DRIVER_ONLY).toBe("yes");
    expect(env.SHARED).toBe("profile");
  });

  test("passes the variables a profile named, under its literal env", async () => {
    const env = await envOf({
      forwarded: { SEARCH_API_KEY: "exa-1", SHARED: "named" },
    });

    expect(env.SEARCH_API_KEY).toBe("exa-1");
    expect(env.SHARED).toBe("profile");
  });

  test("adds none of it when the cell has no profile", async () => {
    expect(await envOf({ profile: null })).toEqual({
      DRIVER_ONLY: "yes",
      SHARED: "driver",
    });
  });
});
