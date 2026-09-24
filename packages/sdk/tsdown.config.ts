import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: { alwaysBundle: [/^@anpord\//] },
  dts: { eager: true },
  entry: {
    api: "src/mock-api/index.ts",
    "api-runtime": "src/mock-api/runtime.ts",
    "api-context": "src/mock-api/context.ts",
    bin: "src/cli/main.ts",
    cli: "src/mock-cli/index.ts",
    command: "src/evals/command.ts",
    "cli-runtime": "src/mock-cli/runtime.ts",
    eval: "src/evals/index.ts",
    index: "src/index.ts",
    mcp: "src/mcp/index.ts",
    "mcp-runtime": "src/mcp/runtime.ts",
    source: "src/evals/source.ts",
    validators: "src/validators.ts",
    "validator-runtime": "src/evals/validator-runtime.ts",
  },
  format: ["esm", "cjs"],
  target: "node20",
  tsconfig: "./tsconfig.build.json",
  treeshake: true,
});
