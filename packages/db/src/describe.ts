import { Config, Effect, Redacted } from "effect";
import { isLocalHost } from "./local-hosts";
import { type Inspection, inspect } from "./migrations/inspect";

const LEADING_SLASH = /^\//;

/* Credentials left behind: this is logged, so a server on the wrong environment says so rather than reading as missing records. */
export const describeDatabase = Config.redacted("DATABASE_URL").pipe(
  Config.map((url) => {
    try {
      const { hostname, pathname } = new URL(Redacted.value(url));
      const name = pathname.replace(LEADING_SLASH, "") || "postgres";
      return {
        host: hostname,
        local: isLocalHost(hostname),
        name,
      };
    } catch {
      return { host: "unknown", local: false, name: "unknown" };
    }
  })
);

const adviceOn = (name: string, inspection: Inspection): readonly string[] => {
  if (inspection.problems.length > 0) {
    return [
      `database ${name} needs attention before it can migrate: ${inspection.problems.join(" ")}`,
    ];
  }
  if (inspection.pending.length > 0) {
    return [
      `database ${name} is missing ${inspection.pending.length} migrations (${inspection.pending.join(", ")}). Run bun run db:migrate.`,
    ];
  }
  return [];
};

const migrationWarnings = (name: string, url: Redacted.Redacted<string>) =>
  Effect.tryPromise(() =>
    inspect(Redacted.value(url), { confirmDataLoss: false })
  ).pipe(
    Effect.map((inspection) => adviceOn(name, inspection)),
    Effect.catchAll((error) =>
      Effect.succeed([
        `could not check migrations on ${name}: ${error.cause instanceof Error ? error.cause.message : String(error.cause)}`,
      ])
    )
  );

export const logDatabase = Effect.gen(function* () {
  const database = yield* describeDatabase;
  yield* Effect.logInfo(
    `database ${database.name} at ${database.host}${database.local ? " (local)" : ""}`
  );
  if (!database.local) {
    return;
  }
  const warnings = yield* migrationWarnings(
    database.name,
    yield* Config.redacted("DATABASE_URL")
  );
  yield* Effect.forEach(warnings, (warning) => Effect.logWarning(warning));
});
