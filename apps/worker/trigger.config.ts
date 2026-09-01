import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
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
