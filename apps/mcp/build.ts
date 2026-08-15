import { rm, writeFile } from "node:fs/promises";

const OUT = "dist";

await rm(OUT, { force: true, recursive: true });

const built = await Bun.build({
  entrypoints: ["src/main.ts"],
  external: ["mcp-use"],
  minify: false,
  outdir: OUT,
  target: "node",
});

if (!built.success) {
  for (const log of built.logs) {
    process.stderr.write(`${log}\n`);
  }
  process.exit(1);
}

const root = await Bun.file("../../package.json").json();
const local = await Bun.file("package.json").json();

/**
 * A deployable manifest: the workspace protocol and the catalog only resolve
 * inside this repository, so the upload pins real versions instead.
 */
await writeFile(
  `${OUT}/package.json`,
  `${JSON.stringify(
    {
      dependencies: { "mcp-use": root.catalog["mcp-use"] },
      name: "anpord-mcp",
      private: true,
      scripts: { start: "node main.js" },
      type: "module",
      version: local.version,
    },
    null,
    2
  )}\n`
);

process.stdout.write(`built ${OUT}/main.js\n`);
