import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_START_REQUEST_CHARACTERS } from "@anpord/schema/domain/eval-quota";
import { compileEval } from "anpord/eval";
import { vendoredEntry, vendoredTargets, vendoredWorkspace } from "./sdk";

const WORKSPACE_CHARACTER_BUDGET = MAX_START_REQUEST_CHARACTERS / 2;
const WORKSPACE_FILE_BUDGET = 100;

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

const refusal = (directory: string) => {
  try {
    vendoredWorkspace(directory);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error(`Expected ${directory} to be refused as a workspace.`);
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
  ).toEqual([".json", ".md", ".mjs", ".mts"]);
  expect(paths.length).toBeLessThanOrEqual(WORKSPACE_FILE_BUDGET);
  expect(JSON.stringify(files).length).toBeLessThanOrEqual(
    WORKSPACE_CHARACTER_BUDGET
  );
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

test("carries every file its manifest points at, declarations included", async () => {
  const files = await filesSource();
  const manifest = files["vendor/anpord/package.json"] ?? "";
  const vendored = JSON.parse(manifest);

  expect(vendored.types).toBeUndefined();
  expect(vendored.exports["."].import.types).toBe("./dist/index.d.mts");

  const targets = vendoredTargets(manifest);
  expect(targets).toContain("vendor/anpord/dist/index.d.mts");
  expect(targets.filter((target) => !(target in files))).toEqual([]);
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
    `The sdk eval workspace does not ship vendor/anpord/dist/index.mjs, which vendor/anpord/package.json points at, so the sandbox does not carry the SDK its manifest describes. Rebuild it with "bun run --cwd packages/sdk build" before compiling this suite.`
  );
});

test("refuses a workspace of more files than its budget allows", async () => {
  const directory = await scratchPackage(
    Object.fromEntries(
      Array.from({ length: WORKSPACE_FILE_BUDGET }, (_, index) => [
        `part-${index}.mjs`,
        "export const part = 1;",
      ])
    )
  );

  const message = refusal(directory);
  expect(message).toContain(
    `workspace is ${WORKSPACE_FILE_BUDGET + 3} files over the ${WORKSPACE_FILE_BUDGET} it budgets.`
  );
  expect(message).not.toContain("characters over the");
});

test("refuses a workspace of more characters than its budget allows", async () => {
  const directory = await scratchPackage({
    "index.mjs": "x".repeat(WORKSPACE_CHARACTER_BUDGET),
  });

  const message = refusal(directory);
  expect(message).toContain(
    `characters of request JSON over the ${WORKSPACE_CHARACTER_BUDGET} it budgets, half of the 3.5MB a batch may submit.`
  );
  expect(message).not.toContain("files over the");
});

test("checks the bin the manifest promises, not only its exports", async () => {
  const files = await filesSource();
  const manifest = files["vendor/anpord/package.json"] ?? "";
  const targets = vendoredTargets(manifest);

  expect(JSON.parse(manifest).bin).toBeDefined();
  expect(targets).toContain("vendor/anpord/dist/bin.mjs");
  expect(targets.filter((target) => !(target in files))).toEqual([]);
});
