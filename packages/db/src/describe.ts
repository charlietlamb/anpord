import { Config, Effect, Redacted } from "effect";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const LEADING_SLASH = /^\//;

/**
 * The host and database a connection string points at, with the credentials
 * left behind.
 *
 * A server started with the wrong environment answers every query correctly
 * against the wrong data, which reads as missing records rather than as a
 * misconfiguration. Saying which database it reached, in the same breath as
 * saying it is listening, is what makes that visible in the first line of a log
 * rather than after someone goes looking for their prompts.
 */
export const describeDatabase = Config.redacted("DATABASE_URL").pipe(
  Config.map((url) => {
    try {
      const { hostname, pathname } = new URL(Redacted.value(url));
      const name = pathname.replace(LEADING_SLASH, "") || "postgres";
      return {
        host: hostname,
        local: LOCAL_HOSTS.has(hostname),
        name,
      };
    } catch {
      return { host: "unknown", local: false, name: "unknown" };
    }
  })
);

export const logDatabase = Effect.flatMap(describeDatabase, (database) =>
  Effect.logInfo(
    `database ${database.name} at ${database.host}${database.local ? " (local)" : ""}`
  )
);
