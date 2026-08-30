import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Option } from "effect";
import { localRepo } from "../../src/evals/local-repo";

let workspace: string | undefined;

const saved = { ...process.env };

afterEach(async () => {
  process.env = { ...saved };

  if (workspace !== undefined) {
    await rm(workspace, { force: true, recursive: true });
    workspace = undefined;
  }
});

const repoAt = async (remote: string) => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-local-repo-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: workspace, stdio: "pipe" });

  git("init", "--quiet");
  git("remote", "add", "origin", remote);
  git(
    "-c",
    "user.email=t@t",
    "-c",
    "user.name=t",
    "commit",
    "--quiet",
    "--allow-empty",
    "-m",
    "local only"
  );

  return workspace;
};

const resolved = (cwd: string) =>
  Effect.runPromise(localRepo(cwd)).then(Option.getOrNull);

describe("the repository an eval was written in", () => {
  test("is not guessed at outside a checkout", async () => {
    process.env.GITHUB_REPOSITORY = "";
    process.env.GIT_CEILING_DIRECTORIES = tmpdir();
    workspace = await mkdtemp(join(tmpdir(), "anpord-bare-dir-"));

    expect(await resolved(workspace)).toBeNull();
  });

  test("reads origin, and leaves the ref alone when the remote lacks it", async () => {
    process.env.GITHUB_HEAD_REF = "";
    const cwd = await repoAt("https://github.com/acme/widgets.git");

    expect(await resolved(cwd)).toEqual({
      kind: "repo",
      ref: null,
      url: "https://github.com/acme/widgets.git",
    });
  });

  test("takes the branch a pull request came from, which the remote has", async () => {
    process.env.GITHUB_HEAD_REF = "feature/parser";
    const cwd = await repoAt("https://github.com/acme/widgets.git");

    expect(await resolved(cwd)).toMatchObject({ ref: "feature/parser" });
  });

  test("falls back to the repository CI names when there is no checkout", async () => {
    process.env.GITHUB_REPOSITORY = "acme/widgets";
    process.env.GITHUB_HEAD_REF = "topic";
    process.env.GIT_CEILING_DIRECTORIES = tmpdir();
    workspace = await mkdtemp(join(tmpdir(), "anpord-ci-only-"));

    expect(await resolved(workspace)).toEqual({
      kind: "repo",
      ref: "topic",
      url: "https://github.com/acme/widgets.git",
    });
  });
});
