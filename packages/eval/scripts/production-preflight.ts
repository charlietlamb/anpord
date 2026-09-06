import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfigLive } from "@anpord/db/config";
import { Actor } from "@anpord/schema/domain/actor";
import { configure, runs } from "@trigger.dev/sdk";
import { ConfigProvider, Effect, Layer, Redacted, Schema } from "effect";
import { CredentialCipherLive } from "../src/credentials/cipher";
import {
  CredentialResolver,
  CredentialResolverLive,
} from "../src/credentials/resolver";

const exec = promisify(execFile);
const aws = async (...args: string[]) =>
  (await exec("aws", [...args, "--region", "us-east-2", "--output", "json"]))
    .stdout;
const strings = Schema.Record({ key: Schema.String, value: Schema.String });
const imageSchema = Schema.Struct({
  RuntimeEnvironmentVariables: Schema.optionalWith(strings, {
    default: () => ({}),
  }),
  RuntimeEnvironmentSecrets: Schema.optionalWith(strings, {
    default: () => ({}),
  }),
});
const arn = Schema.decodeUnknownSync(Schema.parseJson(Schema.String))(
  await aws(
    "apprunner",
    "list-services",
    "--query",
    "ServiceSummaryList[?ServiceName=='anpord-server'].ServiceArn | [0]"
  )
);
const image = Schema.decodeUnknownSync(Schema.parseJson(imageSchema))(
  await aws(
    "apprunner",
    "describe-service",
    "--service-arn",
    arn,
    "--query",
    "Service.SourceConfiguration.ImageRepository.ImageConfiguration"
  )
);
const environment = new Map(Object.entries(image.RuntimeEnvironmentVariables));
for (const name of [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "CREDENTIALS_ENCRYPTION_KEY",
  "TRIGGER_SECRET_KEY",
  "TRIGGER_API_KEY",
]) {
  const secret = image.RuntimeEnvironmentSecrets[name];
  if (secret) {
    environment.set(
      name,
      Schema.decodeUnknownSync(Schema.parseJson(Schema.String))(
        await aws(
          "secretsmanager",
          "get-secret-value",
          "--secret-id",
          secret,
          "--query",
          "SecretString"
        )
      )
    );
  }
}
const actor = Schema.decodeUnknownSync(Actor)({
  id: process.argv[2],
  organizationId: process.argv[2],
  isUser: false,
  permissions: [],
});
const credentials = CredentialResolverLive.pipe(
  Layer.provide(CredentialCipherLive),
  Layer.provide(DatabaseLive.pipe(Layer.provide(DatabaseConfigLive)))
);
await Effect.runPromise(
  Effect.gen(function* () {
    const resolver = yield* CredentialResolver;
    const resolved = yield* resolver.resolve({ actor, integrationId: "codex" });
    console.log({
      organizationId: actor.organizationId,
      codexConnection: Redacted.value(resolved).connectionId,
    });
  }).pipe(
    Effect.provide(credentials),
    Effect.withConfigProvider(ConfigProvider.fromMap(environment)),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error({ credentialError: error.message });
        process.exitCode = 1;
      })
    )
  )
);
const secretKey =
  environment.get("TRIGGER_SECRET_KEY") ?? environment.get("TRIGGER_API_KEY");
if (secretKey) {
  configure({ secretKey });
  const page = await runs.list({ limit: 3 });
  console.log({
    workerRuns: page.data.map(({ id, status, taskIdentifier }) => ({
      id,
      status,
      taskIdentifier,
    })),
  });
} else {
  console.error("Production worker secret is missing");
  process.exitCode = 1;
}
