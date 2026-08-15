import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts", "src/client.ts", "src/cli.ts", "src/config.ts"],
  format: ["esm", "cjs"],
  /** Bundled, not depended on: the schema package is not published. */
  noExternal: [/^@anpord\//],
  target: "node18",
  treeshake: true,
});
