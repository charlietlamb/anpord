import { Effect, Redacted } from "effect";
import { Resend } from "resend";
import type { AuthConfigShape } from "./config";

interface MagicLinkEmail {
  readonly email: string;
  readonly url: string;
}

const subject = "Sign in to Anpord";

const body = (url: string) =>
  [
    "Click the link below to sign in. It expires in 5 minutes and can only be used once.",
    "",
    url,
    "",
    "If you didn't request this, you can ignore this email.",
  ].join("\n");

/**
 * Sends the magic link, or logs it when Resend is unconfigured so local
 * development works without an API key — the link is copied from the server log.
 */
export const makeSendMagicLink = (config: AuthConfigShape) => {
  const credentials = config.resend;
  if (!credentials) {
    return ({ email, url }: MagicLinkEmail) =>
      Effect.runPromise(
        Effect.logWarning(
          `RESEND_API_KEY unset — magic link for ${email}: ${url}`
        )
      );
  }

  const client = new Resend(Redacted.value(credentials.apiKey));

  return ({ email, url }: MagicLinkEmail) =>
    Effect.runPromise(
      Effect.tryPromise(() =>
        client.emails.send({
          from: credentials.from,
          to: email,
          subject,
          text: body(url),
        })
      ).pipe(
        Effect.flatMap((result) =>
          result.error
            ? Effect.fail(new Error(result.error.message))
            : Effect.logInfo(`magic link sent to ${email}`)
        ),
        Effect.tapErrorCause(Effect.logError),
        Effect.asVoid,
        Effect.orDie
      )
    );
};
