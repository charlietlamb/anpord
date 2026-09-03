import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { build, type Plugin } from "esbuild";

const authoringExports = [
  "export const defineEval = value => value;",
  `export { empty, files, repo } from "./source";`,
].join("\n");

const authoringDir = dirname(fileURLToPath(import.meta.url));

const ANPORD_MODULE = /^anpord$/;
const ANY_MODULE = /.*/;

const authoringModule: Plugin = {
  name: "anpord-authoring",
  setup: (compiler) => {
    compiler.onResolve({ filter: ANPORD_MODULE }, () => ({
      namespace: "anpord-authoring",
      path: "anpord",
    }));
    compiler.onLoad(
      { filter: ANY_MODULE, namespace: "anpord-authoring" },
      () => ({
        contents: authoringExports,
        loader: "js",
        resolveDir: authoringDir,
      })
    );
  },
};

export const bundle = (contents: string, entry: string) =>
  Effect.tryPromise({
    try: () =>
      build({
        absWorkingDir: process.cwd(),
        bundle: true,
        format: "esm",
        metafile: true,
        platform: "node",
        resolveExtensions: [".ts", ".mjs", ".js", ".cjs", ".json"],
        plugins: [authoringModule],
        stdin: {
          contents,
          resolveDir: process.cwd(),
          sourcefile: "anpord-eval-entry.ts",
        },
        target: "node18",
        treeShaking: true,
        write: false,
      }).then((result) => ({
        inputs: Object.keys(result.metafile?.inputs ?? {}).map((path) =>
          resolve(path)
        ),
        source: result.outputFiles[0]?.text ?? "",
      })),
    catch: (cause) => new Error(`Could not compile ${entry}`, { cause }),
  });
