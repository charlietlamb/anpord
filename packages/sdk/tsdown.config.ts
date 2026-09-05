import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: { alwaysBundle: [/^@anpord\//] },
  dts: { eager: true },
  entry: {
    bin: "src/cli/main.ts",
    cli: "src/mock-cli/index.ts",
    "cli-runtime": "src/mock-cli/runtime.ts",
    config: "src/client/config.ts",
    eval: "src/evals/compiler.ts",
    index: "src/index.ts",
    mcp: "src/mcp/index.ts",
    "mcp-runtime": "src/mcp/runtime.ts",
    source: "src/evals/source.ts",
  },
  format: ["esm", "cjs"],
  target: "node20",
  treeshake: true,
});
