import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: { alwaysBundle: [/^@anpord\//] },
  dts: { eager: true },
  entry: {
    cli: "src/cli/main.ts",
    config: "src/client/config.ts",
    index: "src/index.ts",
  },
  format: ["esm", "cjs"],
  target: "node18",
  treeshake: true,
});
