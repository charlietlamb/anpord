import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Deferred, Effect, Exit } from "effect";
import {
  type DeviceChallenge,
  parseDeviceChallenge,
  stripAnsi,
} from "./device-challenge";
import { CredentialError } from "./errors";

export interface CodexLogin {
  readonly authJson: Effect.Effect<string, CredentialError>;
  readonly challenge: Effect.Effect<DeviceChallenge, CredentialError>;
  readonly cleanup: Effect.Effect<void>;
}

const couldNotStart = () =>
  new CredentialError({
    code: "internal",
    message: "Could not start Codex login",
  });

const noDeviceCode = () =>
  new CredentialError({
    code: "internal",
    message: "Codex did not return a device code",
  });

export const startCodexLogin = (
  codex: string,
  path: string
): Effect.Effect<CodexLogin, CredentialError> =>
  Effect.gen(function* () {
    const home = yield* Effect.tryPromise({
      catch: couldNotStart,
      try: () => mkdtemp(join(tmpdir(), "anpord-codex-")),
    });
    const child = yield* Effect.try({
      catch: couldNotStart,
      try: () =>
        spawn(codex, ["login", "--device-auth"], {
          env: { CODEX_HOME: home, PATH: path },
          stdio: ["ignore", "pipe", "pipe"],
        }),
    });
    const cleanup = Effect.sync(() => child.kill()).pipe(
      Effect.zipRight(
        Effect.promise(() => rm(home, { force: true, recursive: true }))
      ),
      Effect.ignore
    );
    let output = "";
    const exited = yield* Deferred.make<number>();
    child.once("error", () => Deferred.unsafeDone(exited, Exit.succeed(1)));
    child.once("exit", (code) =>
      Deferred.unsafeDone(exited, Exit.succeed(code ?? 1))
    );
    const challenge = Effect.async<DeviceChallenge, CredentialError>(
      (resume) => {
        const read = (chunk: Buffer) => {
          output += stripAnsi(chunk.toString());
          const parsed = parseDeviceChallenge(output);
          if (parsed) {
            resume(Effect.succeed(parsed));
          }
        };
        const failed = () => resume(Effect.fail(noDeviceCode()));
        child.stdout.on("data", read);
        child.stderr.on("data", read);
        child.once("error", failed);
        child.once("exit", failed);
        return Effect.sync(() => {
          child.stdout.off("data", read);
          child.stderr.off("data", read);
          child.off("error", failed);
          child.off("exit", failed);
        });
      }
    ).pipe(
      Effect.timeoutFail({ duration: "10 seconds", onTimeout: noDeviceCode })
    );
    const loginFailed = () =>
      new CredentialError({ message: "Codex login failed" });
    const authJson = Deferred.await(exited).pipe(
      Effect.filterOrFail((code) => code === 0, loginFailed),
      Effect.zipRight(
        Effect.tryPromise({
          catch: loginFailed,
          try: () => readFile(join(home, "auth.json"), "utf8"),
        })
      )
    );

    return { authJson, challenge, cleanup };
  });
