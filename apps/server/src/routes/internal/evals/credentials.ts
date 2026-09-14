import { FileSystem } from "@effect/platform";
import { Config, Context, Effect, Layer } from "effect";

export interface EvalCredentialsShape {
  readonly codexAuth: string;
}

export class EvalCredentials extends Context.Tag(
  "@anpord/server/EvalCredentials"
)<EvalCredentials, EvalCredentialsShape>() {}

/* Codex only: the one harness that still accepts an auth file from the host,
   kept as a fallback for local runs with no stored connection. */
const codexAuthPath = Config.string("CODEX_AUTH_PATH").pipe(
  Config.orElse(() =>
    Config.string("HOME").pipe(Config.map((home) => `${home}/.codex/auth.json`))
  )
);

export const EvalCredentialsLive = Layer.effect(
  EvalCredentials,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* codexAuthPath.pipe(Effect.orDie);

    const codexAuth = yield* fs.readFileString(path).pipe(
      Effect.tapError(() =>
        Effect.logDebug("No local Codex auth fallback configured").pipe(
          Effect.annotateLogs({ path })
        )
      ),
      Effect.orElseSucceed(() => "")
    );

    return EvalCredentials.of({ codexAuth: codexAuth.trim() });
  })
);
