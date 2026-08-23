import { FileSystem } from "@effect/platform";
import { Config, Context, Effect, Layer } from "effect";

export interface EvalCredentialsShape {
  readonly codexAuth: string;
}

export class EvalCredentials extends Context.Tag(
  "@anpord/server/EvalCredentials"
)<EvalCredentials, EvalCredentialsShape>() {}

const authPath = Config.string("CODEX_AUTH_PATH").pipe(
  Config.orElse(() =>
    Config.string("HOME").pipe(Config.map((home) => `${home}/.codex/auth.json`))
  )
);

export const EvalCredentialsLive = Layer.effect(
  EvalCredentials,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* authPath.pipe(Effect.orDie);

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
