import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { EvalSourceFiles } from "@anpord/schema/domain/eval-source-files";
import { Schema } from "effect";

const CODE_FILE = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const sdkRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SourceMap = Schema.parseJson(
  Schema.Struct({
    version: Schema.Literal(3),
    sources: Schema.Array(Schema.String),
    sourcesContent: Schema.Array(Schema.NullOr(Schema.String)),
  })
);

const projectRoot = (entry: string) => {
  let directory = dirname(entry);
  while (!existsSync(resolve(directory, "package.json"))) {
    const parent = dirname(directory);
    if (parent === directory) {
      return dirname(entry);
    }
    directory = parent;
  }
  return directory;
};

export const sourceFiles = (map: string, entry: string) => {
  const decoded = Schema.decodeUnknownSync(SourceMap)(map);
  const root = realpathSync(projectRoot(entry));
  const entryPath = relative(root, realpathSync(entry)).split(sep).join("/");
  const files = decoded.sources.flatMap((source, index) => {
    const absolute = resolve(dirname(entry), source);
    const path = relative(root, absolute).split(sep).join("/");
    const content = decoded.sourcesContent[index];
    if (
      content == null ||
      path.startsWith("../") ||
      path.split("/").includes("node_modules") ||
      absolute.startsWith(`${sdkRoot}${sep}`) ||
      !CODE_FILE.test(path) ||
      source.includes(":") ||
      basename(path) === "anpord-eval-entry.ts"
    ) {
      return [];
    }
    return [{ path, content }];
  });
  return Schema.decodeUnknownSync(EvalSourceFiles)(
    files.toSorted(
      (a, b) =>
        Number(b.path === entryPath) - Number(a.path === entryPath) ||
        a.path.localeCompare(b.path)
    )
  );
};
