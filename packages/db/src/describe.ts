import { Config, Effect, Redacted } from "effect";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const LEADING_SLASH = /^\//;

/* Credentials left behind: this is logged, so a server on the wrong environment says so rather than reading as missing records. */
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
