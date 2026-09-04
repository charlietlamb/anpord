import { afterEach, describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROFILE_LIMITS } from "@anpord/schema/domain/harness-profile";
import { Effect } from "effect";
import { profileTask } from "../../src/evals/profile-directory";

const FIXTURE = join(import.meta.dir, "../fixtures/sample-profile");

let scratch: string | undefined;

afterEach(async () => {
  if (scratch !== undefined) {
    await rm(scratch, { force: true, recursive: true });
  }
});

/* The fixture is copied rather than read in place, because the directories a
   walker must skip cannot be committed: git refuses a nested .git and ignores
   node_modules. */
const copyOfFixture = async () => {
  scratch = await mkdtemp(join(tmpdir(), "anpord-profile-"));
  const dir = join(scratch, "profile");

  await cp(FIXTURE, dir, { recursive: true });
  await mkdir(join(dir, "workspace/node_modules/ignored"), {
    recursive: true,
  });
  await mkdir(join(dir, "workspace/.git"), { recursive: true });
  await writeFile(join(dir, "workspace/node_modules/ignored/index.js"), "x");
  await writeFile(join(dir, "workspace/.git/HEAD"), "ref: refs/heads/main");

  return dir;
};

const compiled = (
  dir: string,
  base: "command" | "opencode" = "opencode",
  name = "sample"
) =>
  Effect.runPromise(
    profileTask(join(dir, "..", "suite.eval.ts"), {
      harness: { base, profile: { dir: "./profile", name } },
      model: "anthropic/claude-sonnet-4.6",
      provider: "daytona",
    }).pipe(Effect.either)
  );

describe("reading a profile directory", () => {
  test("ships home and workspace files, and nothing else", async () => {
    const dir = await copyOfFixture();
    const outcome = await compiled(dir);

    expect(outcome._tag).toBe("Right");

    if (outcome._tag !== "Right") {
      return;
    }

    expect(Object.keys(outcome.right.profile?.files ?? {})).toEqual([
      "home/.config/opencode/opencode.json",
      "workspace/AGENTS.md",
    ]);
    expect(outcome.right.profile?.files["workspace/AGENTS.md"]).toContain(
      "Keep changes small."
    );
    expect(outcome.right.harness).toBe("opencode");
  });

  test("inlines a manifest value that names a file, and keeps env literal", async () => {
    const dir = await copyOfFixture();
    const outcome = await compiled(dir);

    if (outcome._tag !== "Right") {
      throw new Error(String(outcome.left));
    }

    expect(outcome.right.profile?.systemPrompt).toBe(
      "You are the sample agent.\n"
    );
    expect(outcome.right.profile?.env).toEqual({ SAMPLE_MODE: "strict" });
    expect(outcome.right.profile?.name).toBe("sample");
  });

  test("refuses a manifest value that names a file outside the profile", async () => {
    const dir = await copyOfFixture();

    await writeFile(join(dir, "..", "outside.md"), "not part of the profile");
    await writeFile(
      join(dir, "profile.json"),
      JSON.stringify({ systemPrompt: "../outside.md" })
    );

    const outcome = await compiled(dir);

    expect(outcome._tag).toBe("Left");
    expect(outcome._tag === "Left" && outcome.left._tag).toBe(
      "ProfileManifestOutside"
    );
  });

  test("refuses a file over the per-file limit", async () => {
    const dir = await copyOfFixture();

    await writeFile(
      join(dir, "workspace/big.md"),
      "x".repeat(PROFILE_LIMITS.fileChars + 1)
    );

    const outcome = await compiled(dir);

    expect(outcome._tag === "Left" && outcome.left._tag).toBe(
      "ProfileFileTooLarge"
    );
  });

  test("refuses the command harness without a run command", async () => {
    const dir = await copyOfFixture();
    const outcome = await compiled(dir, "command");

    expect(outcome._tag === "Left" && outcome.left._tag).toBe(
      "CommandProfileNeedsRun"
    );
  });

  test("refuses a run command on a harness that is not command", async () => {
    const dir = await copyOfFixture();

    await writeFile(
      join(dir, "profile.json"),
      JSON.stringify({ run: "python agent.py" })
    );

    const outcome = await compiled(dir);

    expect(outcome._tag === "Left" && outcome.left._tag).toBe(
      "ProfileStepNotSupported"
    );
  });

  test("takes an install command on a harness that is not command", async () => {
    const dir = await copyOfFixture();

    await writeFile(
      join(dir, "profile.json"),
      JSON.stringify({ install: "npx skills add sample/skills" })
    );

    const outcome = await compiled(dir);

    expect(outcome._tag).toBe("Right");
  });

  test("accepts the command harness with a run command", async () => {
    const dir = await copyOfFixture();

    await writeFile(
      join(dir, "profile.json"),
      JSON.stringify({ install: "pip install agent", run: "python agent.py" })
    );

    const outcome = await compiled(dir, "command");

    expect(outcome._tag).toBe("Right");
    expect(outcome._tag === "Right" && outcome.right.profile?.run).toBe(
      "python agent.py"
    );
  });

  test("names a directory that is not there", async () => {
    scratch = await mkdtemp(join(tmpdir(), "anpord-profile-"));
    const outcome = await compiled(join(scratch, "profile"));

    expect(outcome._tag === "Left" && outcome.left._tag).toBe(
      "ProfileDirectoryUnreadable"
    );
  });
});
