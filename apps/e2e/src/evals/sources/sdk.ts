import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SOURCE_FILE_LIMIT,
  SOURCE_LIMIT,
} from "@anpord/schema/domain/eval-source-files";
import { type EvalSource, files } from "anpord";

const VENDOR = "vendor/anpord";

const rootManifest = {
  dependencies: { anpord: `file:./${VENDOR}` },
  name: "anpord-sdk-smoke",
  private: true,
  type: "module",
  version: "0.0.0",
};

const sdkPackage = fileURLToPath(
  new URL("../../../../../packages/sdk", import.meta.url)
);

const modulesUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return modulesUnder(path);
    }
    return entry.name.endsWith(".mjs") ? [path] : [];
  });

const installedVersion = (packageDir: string, name: string): string => {
  const manifest = join(packageDir, "node_modules", name, "package.json");
  if (!existsSync(manifest)) {
    throw new Error(
      `${name} is not installed under ${packageDir}, so the sdk eval cannot pin it to the version this repository tests against. Run "bun install --frozen-lockfile" before compiling this suite.`
    );
  }
  return JSON.parse(readFileSync(manifest, "utf8")).version;
};

const pinnedDependencies = (
  packageDir: string,
  dependencies: Record<string, string> | undefined
) =>
  dependencies === undefined
    ? undefined
    : Object.fromEntries(
        Object.keys(dependencies).map((name) => [
          name,
          installedVersion(packageDir, name),
        ])
      );

const withoutRequire = (target: unknown) =>
  typeof target === "object" && target !== null
    ? Object.fromEntries(
        Object.entries(target).filter(([condition]) => condition !== "require")
      )
    : target;

const esmExports = (exported: Record<string, unknown> | undefined) =>
  exported === undefined
    ? undefined
    : Object.fromEntries(
        Object.entries(exported).map(([subpath, target]) => [
          subpath,
          withoutRequire(target),
        ])
      );

const consumerManifest = (packageDir: string, text: string) => {
  const { devDependencies, main, ...published } = JSON.parse(text);
  return `${JSON.stringify(
    {
      ...published,
      dependencies: pinnedDependencies(packageDir, published.dependencies),
      exports: esmExports(published.exports),
    },
    null,
    2
  )}\n`;
};

const vendoredPath = (dist: string, file: string) =>
  `${VENDOR}/dist/${relative(dist, file).split(sep).join("/")}`;

export const vendoredWorkspace = (packageDir: string): EvalSource => {
  const dist = join(packageDir, "dist");

  if (!existsSync(dist)) {
    throw new Error(
      `${dist} is missing, so the sdk eval has no SDK to ship as its workspace. Build it with "bun run --cwd packages/sdk build" before compiling this suite.`
    );
  }

  const contents: Record<string, string> = {
    "package.json": `${JSON.stringify(rootManifest, null, 2)}\n`,
    [`${VENDOR}/package.json`]: consumerManifest(
      packageDir,
      readFileSync(join(packageDir, "package.json"), "utf8")
    ),
    [`${VENDOR}/README.md`]: readFileSync(
      join(packageDir, "README.md"),
      "utf8"
    ),
  };

  for (const file of modulesUnder(dist)) {
    contents[vendoredPath(dist, file)] = readFileSync(file, "utf8");
  }

  const paths = Object.keys(contents);
  const characters = Object.values(contents).reduce(
    (total, text) => total + text.length,
    0
  );

  if (paths.length > SOURCE_FILE_LIMIT || characters > SOURCE_LIMIT) {
    throw new Error(
      `The sdk eval workspace is ${paths.length} files and ${characters} characters, over the ${SOURCE_FILE_LIMIT} files and ${SOURCE_LIMIT} characters this eval keeps as its budget. Ship less of ${packageDir}, such as fewer entry points, or move the consumer to a suite of its own.`
    );
  }

  return files(contents);
};

export const sdkWorkspace = (): EvalSource => vendoredWorkspace(sdkPackage);
