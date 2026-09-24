import { Effect, Option, Schema } from "effect";
import type { SandboxHandle } from "../../ports/sandbox";
import { runCommandForOutcome } from "../sandbox/run-command";

export const CODEX_AUTH_FILE = ".codex/auth.json";

const AUTH_LIMIT = 6000;

const decodeText = Schema.decodeUnknownOption(Schema.StringFromBase64);

const decodeAuth = Schema.decodeUnknownOption(
  Schema.parseJson(
    Schema.Struct({ tokens: Schema.Struct({ refresh_token: Schema.String }) })
  )
);

const decoded = (encoded: string): Option.Option<string> =>
  encoded === "" || encoded.length > AUTH_LIMIT
    ? Option.none()
    : Option.filter(decodeText(encoded), (text) =>
        Option.isSome(decodeAuth(text))
      );

export const readRotatedAuth = (sandbox: SandboxHandle, home: string) => {
  const path = `${home}/${CODEX_AUTH_FILE}`;

  return runCommandForOutcome(
    sandbox,
    `base64 -w 0 ${path} 2>/dev/null || base64 -i ${path} 2>/dev/null`
  ).pipe(
    Effect.map(({ exitCode, stdout }) =>
      exitCode === 0 ? decoded(stdout.trim()) : Option.none()
    ),
    Effect.orElseSucceed(() => Option.none<string>())
  );
};
