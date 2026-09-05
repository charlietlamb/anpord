import { existsSync } from "node:fs";
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
const localModules = [
  {
    built: "cli.mjs",
    filter: /^anpord\/cli$/,
    namespace: "anpord-cli-authoring",
    source: "../mock-cli/index.ts",
  },
  {
    built: "cli-runtime.mjs",
    filter: /^anpord\/cli\/runtime$/,
    namespace: "anpord-cli-runtime",
    source: "../mock-cli/runtime.ts",
  },
  {
    built: "mcp.mjs",
    filter: /^anpord\/mcp$/,
    namespace: "anpord-mcp-authoring",
    source: "../mcp/index.ts",
  },
  {
    built: "mcp-runtime.mjs",
    filter: /^anpord\/mcp\/runtime$/,
    namespace: "anpord-mcp-runtime",
    source: "../mcp/runtime.ts",
  },
] as const;

const authoringModule: Plugin = {
  name: "anpord-authoring",
  setup: (compiler) => {
    compiler.onResolve({ filter: ANPORD_MODULE }, () => ({
      namespace: "anpord-authoring",
      path: "anpord",
    }));
    for (const module of localModules) {
      compiler.onResolve({ filter: module.filter }, ({ path }) => ({
        namespace: module.namespace,
        path,
      }));
      compiler.onLoad(
        { filter: ANY_MODULE, namespace: module.namespace },
        () => {
          const source = resolve(authoringDir, module.source);
          const resolved = existsSync(source)
            ? source
            : resolve(authoringDir, module.built);
          return {
            contents: `export * from ${JSON.stringify(resolved)};`,
            loader: "js",
            resolveDir: authoringDir,
          };
        }
      );
    }
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

export const bundle = (
  contents: string,
  entry: string,
  options: { readonly minify?: boolean } = {}
) =>
  Effect.tryPromise({
    try: () =>
      build({
        absWorkingDir: process.cwd(),
        bundle: true,
        format: "esm",
        metafile: true,
        minify: options.minify,
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
