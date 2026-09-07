import { Effect, Option } from "effect";
import type { SandboxHandle } from "../../ports/sandbox";
import { runCommandForOutcome } from "../sandbox/run-command";

/* Codex refreshes its ChatGPT token in the sandbox and writes it to auth.json.
   Unless that file is read back before the sandbox goes, the stored copy stays
   the spent pre-rotation token and every later run fails to refresh. */

const AUTH_LIMIT = 6000;

/* Command output is captured as a bounded tail, so a file long enough to be
   clipped would come back as a valid-looking prefix of itself. base64 makes
   any clipping a decode failure rather than silent corruption. */
export const readRotatedAuth = (sandbox: SandboxHandle, home: string) =>
  runCommandForOutcome(
    sandbox,
    `base64 -w 0 ${home}/.codex/auth.json 2>/dev/null || base64 -i ${home}/.codex/auth.json 2>/dev/null`
  ).pipe(
    Effect.map(({ exitCode, stdout }) =>
      exitCode === 0 ? decoded(stdout.trim()) : Option.none()
    ),
    Effect.orElseSucceed(() => Option.none<string>())
  );

const decoded = (encoded: string): Option.Option<string> => {
  if (encoded === "" || encoded.length > AUTH_LIMIT) {
    return Option.none();
  }

  try {
    const text = Buffer.from(encoded, "base64").toString("utf8");

    /* Parsing proves the read was whole. A clipped tail decodes to something,
       but never to an object carrying the tokens. */
    const parsed = JSON.parse(text) as { tokens?: { refresh_token?: string } };

    return parsed.tokens?.refresh_token === undefined
      ? Option.none()
      : Option.some(text);
  } catch {
    return Option.none();
  }
};
