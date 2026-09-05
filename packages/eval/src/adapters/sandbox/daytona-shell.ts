import { Clock, Effect, Random } from "effect";
import { sandboxUnavailable } from "../../domain/errors";

export const HOME = "/home/daytona";
export const DEFAULT_TIMEOUT_MS = 120_000;

export const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

/* A name that is not a shell identifier cannot be exported at all, so it is
   dropped rather than quoted: quoting it would produce a command that fails
   at run time instead of a variable nobody can read. */
const EXPORTABLE = /^[A-Za-z_][A-Za-z0-9_]*$/;

const exporting = (env: Readonly<Record<string, string>> | undefined) => {
  const entries = Object.entries(env ?? {}).filter(([name]) =>
    EXPORTABLE.test(name)
  );

  return entries.length === 0
    ? ""
    : `${entries
        .map(([name, value]) => `export ${name}=${quoted(value)};`)
        .join(" ")} `;
};

export const cdInto = (
  workspace: string,
  command: string,
  env?: Readonly<Record<string, string>>
) => `${exporting(env)}cd ${quoted(workspace)} && ${command}`;

export const unavailable = (reason: unknown) =>
  sandboxUnavailable("daytona", reason);

/* The clock alone is not enough: trials run concurrently and two commands
   starting in the same millisecond would name one session, where the second
   createSession either fails or attaches to the first and polls its logs. */
export const sessionName = Effect.gen(function* () {
  const at = yield* Clock.currentTimeMillis;
  const salt = yield* Random.nextIntBetween(0, 1_000_000);

  return `anpord-${at}-${salt}`;
});
