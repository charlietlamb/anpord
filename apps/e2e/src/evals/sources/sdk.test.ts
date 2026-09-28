import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SOURCE_FILE_LIMIT,
  SOURCE_LIMIT,
} from "@anpord/schema/domain/eval-source-files";
import { compileEval } from "anpord/eval";
import { vendoredWorkspace } from "./sdk";

const scratched: string[] = [];

afterEach(async () => {
  await Promise.all(
    scratched
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true }))
  );
});

const scratchPackage = async (modules: Readonly<Record<string, string>>) => {
  const directory = await mkdtemp(join(tmpdir(), "anpord-vendored-"));
  scratched.push(directory);
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify({ name: "anpord", version: "0.0.0" })
  );
  await writeFile(join(directory, "README.md"), "# anpord\n");
  if (Object.keys(modules).length > 0) {
    await mkdir(join(directory, "dist"));
    await Promise.all(
      Object.entries(modules).map(([name, text]) =>
        writeFile(join(directory, "dist", name), text)
      )
    );
  }
  return directory;
};

const filesSource = async () => {
  const compiled = await compileEval(
    fileURLToPath(new URL("../sdk.eval.ts", import.meta.url))
  );
  const source = compiled.cases[0]?.source;
  if (source?.kind !== "files") {
    throw new Error(`Expected a files source, got ${source?.kind}`);
  }
  return source.files;
};

test("ships the built SDK as the workspace the agent starts from", async () => {
  const files = await filesSource();

  expect(JSON.parse(files["package.json"] ?? "").dependencies).toEqual({
    anpord: "file:./vendor/anpord",
  });

  const vendored = JSON.parse(files["vendor/anpord/package.json"] ?? "");
  expect(vendored.name).toBe("anpord");
  expect(vendored.devDependencies).toBeUndefined();
  expect(vendored.exports["."].import.default).toBe("./dist/index.mjs");
  expect(files["vendor/anpord/dist/index.mjs"]).toContain("Anpord =");
  expect(files["vendor/anpord/README.md"]).toContain("npm install anpord");

  const paths = Object.keys(files);
  expect(
    [...new Set(paths.map((path) => path.slice(path.lastIndexOf("."))))].sort()
  ).toEqual([".json", ".md", ".mjs"]);
  expect(paths.length).toBeLessThanOrEqual(SOURCE_FILE_LIMIT);
  expect(
    Object.values(files).reduce((total, text) => total + text.length, 0)
  ).toBeLessThanOrEqual(SOURCE_LIMIT);
});

test("asks for a build instead of shipping an empty workspace", async () => {
  const directory = await scratchPackage({});

  expect(() => vendoredWorkspace(directory)).toThrow(
    `${join(directory, "dist")} is missing, so the sdk eval has no SDK to ship as its workspace. Build it with "bun run --cwd packages/sdk build" before compiling this suite.`
  );
});

test("refuses a workspace of more files than a source may carry", async () => {
  const directory = await scratchPackage(
    Object.fromEntries(
      Array.from({ length: SOURCE_FILE_LIMIT }, (_, index) => [
        `part-${index}.mjs`,
        "export const part = 1;",
      ])
    )
  );

  expect(() => vendoredWorkspace(directory)).toThrow(
    `workspace is ${SOURCE_FILE_LIMIT + 3} files and`
  );
  expect(() => vendoredWorkspace(directory)).toThrow(
    `over the ${SOURCE_FILE_LIMIT} files and ${SOURCE_LIMIT} characters an eval source may carry.`
  );
});

test("refuses a workspace of more characters than a source may carry", async () => {
  const directory = await scratchPackage({
    "index.mjs": "x".repeat(SOURCE_LIMIT),
  });

  expect(() => vendoredWorkspace(directory)).toThrow(
    "workspace is 4 files and"
  );
  expect(() => vendoredWorkspace(directory)).toThrow(
    `over the ${SOURCE_FILE_LIMIT} files and ${SOURCE_LIMIT} characters an eval source may carry.`
  );
});
