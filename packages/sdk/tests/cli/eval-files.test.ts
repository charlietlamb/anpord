import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import { evalFilesIn } from "../../src/cli/eval-files";

let workspace: string | undefined;

afterEach(async () => {
  if (workspace !== undefined) {
    await rm(workspace, { force: true, recursive: true });
    workspace = undefined;
  }
});

const treeWith = async (paths: readonly string[]) => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-files-"));

  for (const path of paths) {
    const full = join(workspace, path);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, "");
  }

  return workspace;
};

const found = (directory: string) =>
  Effect.runPromise(
    evalFilesIn(directory).pipe(Effect.provide(NodeContext.layer))
  );

describe("finding the suites in a repository", () => {
  test("takes every eval file, wherever it sits", async () => {
    const cwd = await treeWith([
      "anpord.eval.ts",
      "evals/smoke.eval.ts",
      "evals/parser.eval.ts",
    ]);

    expect(await found(cwd)).toEqual([
      "anpord.eval.ts",
      "evals/parser.eval.ts",
      "evals/smoke.eval.ts",
    ]);
  });

  test("leaves alone what is not a suite", async () => {
    const cwd = await treeWith(["notes.ts", "eval.ts", "a.eval.tsx"]);

    expect(await found(cwd)).toEqual([]);
  });

  test("does not read installed packages or hidden directories", async () => {
    const cwd = await treeWith([
      "node_modules/pkg/a.eval.ts",
      ".cache/b.eval.ts",
      "real.eval.ts",
    ]);

    expect(await found(cwd)).toEqual(["real.eval.ts"]);
  });
});
