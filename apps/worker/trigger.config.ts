import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";
import { defineConfig } from "@trigger.dev/sdk";

/* The worker reads the rows the server writes, so it reads them from the
   secret the server runs on. Set by hand once, it named a database the server
   had already moved off, and every run died loading its cells. */
const serverSecret = async (id: string) => {
  const secrets = new SecretsManagerClient({ region: "us-east-2" });
  const { SecretString } = await secrets.send(
    new GetSecretValueCommand({ SecretId: id })
  );

  if (SecretString === undefined) {
    throw new Error(`${id} holds no value`);
  }

  return SecretString;
};

export default defineConfig({
  /* autoDetectExternal cannot see a dependency reached through require() at
     runtime, so the Daytona SDK shipped a stub and every sandbox upload failed
     with "Module form-data is not available". */
  build: {
    external: ["form-data"],
    extensions: [
      syncEnvVars(async () => [
        {
          isSecret: true,
          name: "DATABASE_URL",
          value: await serverSecret("anpord/server/DATABASE_URL"),
        },
      ]),
    ],
  },
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
