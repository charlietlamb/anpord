import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SOURCE_FILE_LIMIT,
  SOURCE_LIMIT,
} from "@anpord/schema/domain/eval-source-files";
import { type EvalSource, files } from "anpord";

const VENDOR = "vendor/anpord";
const LEADING_DOT_SLASH = /^\.\//;

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

export const vendoredEntry = (manifest: string): string => {
  const entry = JSON.parse(manifest).exports?.["."]?.import?.default;
  if (typeof entry !== "string") {
    throw new Error(
      `${VENDOR}/package.json names no root import entry, so nothing the agent writes can import "anpord".`
    );
  }
  return `${VENDOR}/${entry.replace(LEADING_DOT_SLASH, "")}`;
};

const overBudget = (paths: number, characters: number) =>
  [
    paths > SOURCE_FILE_LIMIT
      ? `${paths} files over the ${SOURCE_FILE_LIMIT} it budgets`
      : undefined,
    characters > SOURCE_LIMIT
      ? `${characters} characters over the ${SOURCE_LIMIT} it budgets`
      : undefined,
  ].filter((over) => over !== undefined);

const vendoredPath = (dist: string, file: string) =>
  `${VENDOR}/dist/${relative(dist, file).split(sep).join("/")}`;

export const vendoredWorkspace = (packageDir: string): EvalSource => {
  const dist = join(packageDir, "dist");

  if (!existsSync(dist)) {
    throw new Error(
      `${dist} is missing, so the sdk eval has no SDK to ship as its workspace. Build it with "bun run --cwd packages/sdk build" before compiling this suite.`
    );
  }

  const vendoredManifest = consumerManifest(
    packageDir,
    readFileSync(join(packageDir, "package.json"), "utf8")
  );

  const contents: Record<string, string> = {
    "package.json": `${JSON.stringify(rootManifest, null, 2)}\n`,
    [`${VENDOR}/package.json`]: vendoredManifest,
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

  const over = overBudget(paths.length, characters);
  if (over.length > 0) {
    throw new Error(
      `The sdk eval workspace is ${over.join(" and ")}. Ship less of ${packageDir}, such as fewer entry points, or move the consumer to a suite of its own.`
    );
  }

  const entry = vendoredEntry(vendoredManifest);
  if (!(entry in contents)) {
    throw new Error(
      `The sdk eval workspace does not ship ${entry}, the entry ${VENDOR}/package.json points at, so nothing the agent writes can import "anpord". Rebuild it with "bun run --cwd packages/sdk build" before compiling this suite.`
    );
  }

  return files(contents);
};

export const sdkWorkspace = (): EvalSource => vendoredWorkspace(sdkPackage);
