import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: { alwaysBundle: [/^@anpord\//] },
  dts: { eager: true },
  entry: ["src/index.ts", "src/client.ts", "src/cli.ts", "src/config.ts"],
  format: ["esm", "cjs"],
  target: "node18",
  treeshake: true,
});
