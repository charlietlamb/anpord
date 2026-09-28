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
import { vendoredEntry, vendoredWorkspace } from "./sdk";

const EXACT_VERSION = /^\d+\.\d+\.\d+/;

const scratched: string[] = [];

afterEach(async () => {
  await Promise.all(
    scratched
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true }))
  );
});

const scratchPackage = async (
  modules: Readonly<Record<string, string>>,
  installed: Readonly<Record<string, string | null>> = {}
) => {
  const directory = await mkdtemp(join(tmpdir(), "anpord-vendored-"));
  scratched.push(directory);
  const declared = Object.keys(installed);
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify({
      name: "anpord",
      version: "0.0.0",
      exports: { ".": { import: { default: "./dist/index.mjs" } } },
      ...(declared.length > 0
        ? {
            dependencies: Object.fromEntries(
              declared.map((name) => [name, "*"])
            ),
          }
        : {}),
    })
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
  for (const [name, version] of Object.entries(installed)) {
    if (version === null) {
      continue;
    }
    const module = join(directory, "node_modules", name);
    await mkdir(module, { recursive: true });
    await writeFile(
      join(module, "package.json"),
      JSON.stringify({ name, version })
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

  const entry = vendoredEntry(files["vendor/anpord/package.json"] ?? "");
  expect(entry).toBe("vendor/anpord/dist/index.mjs");
  expect((files[entry] ?? "").length).toBeGreaterThan(1000);
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

test("advertises only the ESM build it actually ships", async () => {
  const files = await filesSource();
  const vendored = JSON.parse(files["vendor/anpord/package.json"] ?? "");

  expect(vendored.main).toBeUndefined();
  expect(vendored.module).toBe("./dist/index.mjs");
  expect(vendored.bin).toEqual({ anpord: "./dist/bin.mjs" });
  expect(
    Object.entries(vendored.exports).filter(
      ([, target]) =>
        typeof target === "object" && target !== null && "require" in target
    )
  ).toEqual([]);
});

test("pins every dependency to the version the monorepo installs", async () => {
  const files = await filesSource();
  const { dependencies } = JSON.parse(
    files["vendor/anpord/package.json"] ?? ""
  );

  expect(Object.keys(dependencies)).toContain("effect");
  expect(
    Object.entries(dependencies).filter(
      ([, version]) => !EXACT_VERSION.test(String(version))
    )
  ).toEqual([]);
});

test("pins a declared dependency to what node_modules holds", async () => {
  const directory = await scratchPackage(
    { "index.mjs": "export const anpord = 1;" },
    { effect: "3.21.2", yaml: "2.9.0" }
  );

  const source = vendoredWorkspace(directory);
  if (source.kind !== "files") {
    throw new Error(`Expected a files source, got ${source.kind}`);
  }

  expect(
    JSON.parse(source.files["vendor/anpord/package.json"] ?? "").dependencies
  ).toEqual({ effect: "3.21.2", yaml: "2.9.0" });
});

test("asks for an install when a dependency is absent from node_modules", async () => {
  const directory = await scratchPackage(
    { "index.mjs": "export const anpord = 1;" },
    { effect: null }
  );

  expect(() => vendoredWorkspace(directory)).toThrow(
    `effect is not installed under ${directory}, so the sdk eval cannot pin it to the version this repository tests against. Run "bun install --frozen-lockfile" before compiling this suite.`
  );
});

test("asks for a build instead of shipping an empty workspace", async () => {
  const directory = await scratchPackage({});

  expect(() => vendoredWorkspace(directory)).toThrow(
    `${join(directory, "dist")} is missing, so the sdk eval has no SDK to ship as its workspace. Build it with "bun run --cwd packages/sdk build" before compiling this suite.`
  );
});

test("refuses a build missing the entry its manifest points at", async () => {
  const directory = await scratchPackage({
    "other.mjs": "export const other = 1;",
  });

  expect(() => vendoredWorkspace(directory)).toThrow(
    `The sdk eval workspace does not ship vendor/anpord/dist/index.mjs, the entry vendor/anpord/package.json points at, so nothing the agent writes can import "anpord". Rebuild it with "bun run --cwd packages/sdk build" before compiling this suite.`
  );
});

test("refuses a workspace of more files than its budget allows", async () => {
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
    `over the ${SOURCE_FILE_LIMIT} files and ${SOURCE_LIMIT} characters this eval keeps as its budget.`
  );
});

test("refuses a workspace of more characters than its budget allows", async () => {
  const directory = await scratchPackage({
    "index.mjs": "x".repeat(SOURCE_LIMIT),
  });

  expect(() => vendoredWorkspace(directory)).toThrow(
    "workspace is 4 files and"
  );
  expect(() => vendoredWorkspace(directory)).toThrow(
    `over the ${SOURCE_FILE_LIMIT} files and ${SOURCE_LIMIT} characters this eval keeps as its budget.`
  );
});
