import type { EmailMessage } from "./email-message";

export interface MagicLinkInvitation {
  readonly email: string;
  readonly expiresInMinutes: number;
  readonly url: string;
}

export const magicLinkEmail = ({
  email,
  expiresInMinutes,
  url,
}: MagicLinkInvitation): EmailMessage => ({
  subject: "Sign in to Anpord",
  text: [
    `Click the link below to sign in. It expires in ${expiresInMinutes} minutes and can only be used once.`,
    "",
    url,
    "",
    "If you didn't request this, you can ignore this email.",
  ].join("\n"),
  to: email,
});
