import { FileSystem } from "@effect/platform";
import { Config, Context, Effect, Layer } from "effect";

export interface EvalCredentialsShape {
  /** The Codex auth file, read once at startup.
   *
   * A ChatGPT subscription authenticates over OAuth rather than with an API
   * key, so what a sandbox needs is the file the CLI writes for itself. It is
   * held as a plain string only inside this service; everything downstream
   * takes it as `Redacted` so an accidental log renders nothing useful. */
  readonly codexAuth: string;
}

export class EvalCredentials extends Context.Tag(
  "@anpord/server/EvalCredentials"
)<EvalCredentials, EvalCredentialsShape>() {}

const authPath = Config.string("CODEX_AUTH_PATH").pipe(
  Config.withDefault(`${process.env.HOME ?? ""}/.codex/auth.json`)
);

export const EvalCredentialsLive = Layer.effect(
  EvalCredentials,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* authPath;

    /* Read once rather than per request: the file does not change while the
       server runs, and a missing one should fail at startup rather than
       halfway through a run that has already opened sandboxes. */
    const codexAuth = yield* fs.readFileString(path).pipe(
      Effect.tapError(() =>
        Effect.logWarning(
          "No Codex auth file, so eval runs will fail until one exists"
        ).pipe(Effect.annotateLogs({ path }))
      ),
      Effect.orElseSucceed(() => "")
    );

    return EvalCredentials.of({ codexAuth: codexAuth.trim() });
  })
);
