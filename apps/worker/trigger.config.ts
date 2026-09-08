import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  /* autoDetectExternal cannot see a dependency reached through require() at
     runtime, so the Daytona SDK shipped a stub and every sandbox upload failed
     with "Module form-data is not available". */
  build: { external: ["form-data"] },
  dirs: ["./src/trigger"],
  maxDuration: 3600,
  /* The project this worker deploys to. An identifier rather than a secret,
     and the CLI reads this file before any env file is loaded. */
  project: "proj_wfvqntpksdxcszzirsew",
  retries: {
    default: {
      factor: 2,
      maxAttempts: 3,
      maxTimeoutInMs: 30_000,
      minTimeoutInMs: 1000,
      randomize: true,
    },
    enabledInDev: false,
  },
});
