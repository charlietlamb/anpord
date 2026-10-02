import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAX_START_REQUEST_CHARACTERS,
  MEGABYTE,
} from "@sphynx/schema/domain/eval-quota";
import { type EvalSource, files } from "sphynx-sh";

const VENDOR = "vendor/sphynx-sh";
const LEADING_DOT_SLASH = /^\.\//;
const SHIPPED = [".mjs", ".d.mts"];
const WORKSPACE_CHARACTER_BUDGET = MAX_START_REQUEST_CHARACTERS / 2;

const WORKSPACE_FILE_BUDGET = 100;

const rootManifest = {
  dependencies: { "sphynx-sh": `file:./${VENDOR}` },
  name: "sphynx-sdk-smoke",
  private: true,
  type: "module",
  version: "0.0.0",
};

const sdkPackage = fileURLToPath(
  new URL("../../../../../packages/sdk", import.meta.url)
);

const shippedUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return shippedUnder(path);
    }
    return SHIPPED.some((suffix) => entry.name.endsWith(suffix)) ? [path] : [];
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
  const { devDependencies, main, types, ...published } = JSON.parse(text);
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

const inWorkspace = (target: string) =>
  `${VENDOR}/${target.replace(LEADING_DOT_SLASH, "")}`;

export const vendoredEntry = (manifest: string): string => {
  const entry = JSON.parse(manifest).exports?.["."]?.import?.default;
  if (typeof entry !== "string") {
    throw new Error(
      `${VENDOR}/package.json names no root import entry, so nothing the agent writes can import "sphynx-sh".`
    );
  }
  return inWorkspace(entry);
};

const targetsOf = (target: unknown): readonly string[] =>
  typeof target === "string"
    ? [inWorkspace(target)]
    : Object.values(target as Record<string, unknown>).flatMap(targetsOf);

export const vendoredTargets = (manifest: string): readonly string[] => {
  const { bin, exports, module } = JSON.parse(manifest);
  return [bin, exports, module]
    .filter((named) => named !== undefined)
    .flatMap(targetsOf);
};

const overBudget = (paths: number, characters: number) =>
  [
    paths > WORKSPACE_FILE_BUDGET
      ? `${paths} files over the ${WORKSPACE_FILE_BUDGET} it budgets`
      : undefined,
    characters > WORKSPACE_CHARACTER_BUDGET
      ? `${characters} characters of request JSON over the ${WORKSPACE_CHARACTER_BUDGET} it budgets, half of the ${MAX_START_REQUEST_CHARACTERS / MEGABYTE}MB a batch may submit`
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

  for (const file of shippedUnder(dist)) {
    contents[vendoredPath(dist, file)] = readFileSync(file, "utf8");
  }

  const over = overBudget(
    Object.keys(contents).length,
    JSON.stringify(contents).length
  );
  if (over.length > 0) {
    throw new Error(
      `The sdk eval workspace is ${over.join(" and ")}. The rest of that budget carries the prompt, the bundled validators and the variants, so ship less of ${packageDir}, such as fewer entry points, or move the consumer to a suite of its own.`
    );
  }

  const missing = [
    vendoredEntry(vendoredManifest),
    ...vendoredTargets(vendoredManifest),
  ].filter((target) => !(target in contents));
  if (missing.length > 0) {
    throw new Error(
      `The sdk eval workspace does not ship ${[...new Set(missing)].join(", ")}, which ${VENDOR}/package.json points at, so the sandbox does not carry the SDK its manifest describes. Rebuild it with "bun run --cwd packages/sdk build" before compiling this suite.`
    );
  }

  return files(contents);
};

export const sdkWorkspace = (): EvalSource => vendoredWorkspace(sdkPackage);
