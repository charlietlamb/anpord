import { Config, Effect, Redacted } from "effect";
import { isLocalHost } from "./local-hosts";
import { inspect } from "./migrations/inspect";

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

const pendingMigrations = (url: Redacted.Redacted<string>) =>
  Effect.tryPromise(() =>
    inspect(Redacted.value(url), { confirmDataLoss: false })
  ).pipe(
    Effect.map((inspection) => inspection.pending),
    Effect.orElseSucceed((): readonly string[] => [])
  );

export const logDatabase = Effect.gen(function* () {
  const database = yield* describeDatabase;
  yield* Effect.logInfo(
    `database ${database.name} at ${database.host}${database.local ? " (local)" : ""}`
  );
  if (!database.local) {
    return;
  }
  const pending = yield* pendingMigrations(
    yield* Config.redacted("DATABASE_URL")
  );
  if (pending.length > 0) {
    yield* Effect.logWarning(
      `database ${database.name} is missing ${pending.length} migrations (${pending.join(", ")}). Run bun run db:migrate.`
    );
  }
});
