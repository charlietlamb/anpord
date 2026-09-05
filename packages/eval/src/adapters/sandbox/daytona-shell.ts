import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Clock, Effect, Random } from "effect";
import { sandboxUnavailable } from "../../domain/errors";
import { type EnvFile, quoted } from "./env-file";

export const HOME = "/home/daytona";
export const DEFAULT_TIMEOUT_MS = 120_000;

export const cdInto = (workspace: string, command: string) =>
  `cd ${quoted(workspace)} && ${command}`;

export const unavailable = (reason: unknown) =>
  sandboxUnavailable("daytona", reason);

/* Uploaded rather than echoed into place, because the session API retains
   every command it is given and an echo would put the values there. */
export const uploadedEnv = (sandbox: DaytonaSandbox, file: EnvFile | null) =>
  file === null
    ? Effect.void
    : Effect.tryPromise({
        catch: unavailable,
        try: () => sandbox.fs.uploadFile(Buffer.from(file.contents), file.path),
      });

/* The clock alone is not enough: trials run concurrently and two commands
   starting in the same millisecond would name one session, where the second
   createSession either fails or attaches to the first and polls its logs. */
export const sessionName = Effect.gen(function* () {
  const at = yield* Clock.currentTimeMillis;
  const salt = yield* Random.nextIntBetween(0, 1_000_000);

  return `anpord-${at}-${salt}`;
});
