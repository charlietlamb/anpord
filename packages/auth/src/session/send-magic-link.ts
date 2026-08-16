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
        .pipe(Effect.tapErrorCause(Effect.logError), Effect.orDie)
    );
