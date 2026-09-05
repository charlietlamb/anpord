import { magicLinkEmail } from "@anpord/notifications/email/magic-link";
import type { EmailSenderShape } from "@anpord/notifications/email/sender";
import { Effect } from "effect";

export const MAGIC_LINK_EXPIRY_SECONDS = 300;

const SECONDS_PER_MINUTE = 60;

interface MagicLinkRequest {
  readonly email: string;
  readonly url: string;
}

export const sendMagicLink =
  (emails: EmailSenderShape) =>
  ({ email, url }: MagicLinkRequest) =>
    Effect.runPromise(
      emails
        .send(
          magicLinkEmail({
            email,
            expiresInMinutes: MAGIC_LINK_EXPIRY_SECONDS / SECONDS_PER_MINUTE,
            url,
          })
        )
        .pipe(
          Effect.tapErrorCause(Effect.logError),
          /* Rejected rather than died: a provider that refuses the send is a
             thing the person signing in can be told about and retry, and
             dying turns it into a blank 500 that names nothing. */
          Effect.mapError(
            () =>
              new Error(
                "The sign-in link could not be sent. Try again, and if it keeps failing the address may be unreachable."
              )
          )
        )
    );
