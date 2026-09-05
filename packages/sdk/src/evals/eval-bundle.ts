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
const ANPORD_MCP_MODULE = /^anpord\/mcp$/;
const ANPORD_MCP_RUNTIME_MODULE = /^anpord\/mcp\/runtime$/;
const ANY_MODULE = /.*/;

const authoringModule: Plugin = {
  name: "anpord-authoring",
  setup: (compiler) => {
    compiler.onResolve({ filter: ANPORD_MODULE }, () => ({
      namespace: "anpord-authoring",
      path: "anpord",
    }));
    compiler.onResolve({ filter: ANPORD_MCP_MODULE }, () => ({
      namespace: "anpord-mcp-authoring",
      path: "anpord/mcp",
    }));
    compiler.onResolve({ filter: ANPORD_MCP_RUNTIME_MODULE }, () => ({
      namespace: "anpord-mcp-runtime",
      path: "anpord/mcp/runtime",
    }));
    compiler.onLoad(
      { filter: ANY_MODULE, namespace: "anpord-authoring" },
      () => ({
        contents: authoringExports,
        loader: "js",
        resolveDir: authoringDir,
      })
    );
    compiler.onLoad(
      { filter: ANY_MODULE, namespace: "anpord-mcp-runtime" },
      () => {
        const source = resolve(authoringDir, "../mcp/runtime.ts");
        const module = existsSync(source)
          ? source
          : resolve(authoringDir, "mcp-runtime.mjs");

        return {
          contents: `export * from ${JSON.stringify(module)};`,
          loader: "js",
          resolveDir: authoringDir,
        };
      }
    );
    compiler.onLoad(
      { filter: ANY_MODULE, namespace: "anpord-mcp-authoring" },
      () => {
        const source = resolve(authoringDir, "../mcp/index.ts");
        const module = existsSync(source)
          ? source
          : resolve(authoringDir, "mcp.mjs");

        return {
          contents: `export * from ${JSON.stringify(module)};`,
          loader: "js",
          resolveDir: authoringDir,
        };
      }
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
