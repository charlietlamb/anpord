import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { discoverEvalFiles } from "../../src/evals/discover";

describe("discoverEvalFiles", () => {
  test("finds eval files recursively without entering generated directories", async () => {
    const directory = await mkdtemp(join(tmpdir(), "anpord-discovery-"));
    const nested = join(directory, "evals", "nested");
    const dependencies = join(directory, "node_modules", "fixture");
    const output = join(directory, "dist");

    try {
      await Promise.all([
        mkdir(nested, { recursive: true }),
        mkdir(dependencies, { recursive: true }),
        mkdir(output, { recursive: true }),
      ]);
      await Promise.all([
        writeFile(join(directory, "root.eval.ts"), ""),
        writeFile(join(nested, "nested.eval.ts"), ""),
        writeFile(join(dependencies, "ignored.eval.ts"), ""),
        writeFile(join(output, "ignored.eval.ts"), ""),
      ]);

      const files = await Effect.runPromise(discoverEvalFiles([directory]));

      expect(files).toEqual([
        join(nested, "nested.eval.ts"),
        join(directory, "root.eval.ts"),
      ]);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  test("accepts an explicitly named file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "anpord-discovery-"));
    const file = join(directory, "eval.ts");

    try {
      await writeFile(file, "");
      expect(await Effect.runPromise(discoverEvalFiles([file]))).toEqual([
        file,
      ]);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  test("refuses an empty discovery", async () => {
    const directory = await mkdtemp(join(tmpdir(), "anpord-discovery-"));

    try {
      await expect(
        Effect.runPromise(discoverEvalFiles([directory]))
      ).rejects.toThrow("No **/*.eval.ts files found");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });
});
