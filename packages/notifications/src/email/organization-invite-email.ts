import type { EmailMessage } from "./email-message";

export interface OrganizationInvite {
  readonly email: string;
  readonly invitedBy: string | null;
  readonly organization: string;
  readonly url: string;
}

export const organizationInviteEmail = ({
  email,
  invitedBy,
  organization,
  url,
}: OrganizationInvite): EmailMessage => ({
  subject: `Join ${organization} on Sphynx`,
  text: [
    invitedBy === null
      ? `You have been invited to join ${organization} on Sphynx.`
      : `${invitedBy} has invited you to join ${organization} on Sphynx.`,
    "",
    "Open the link below to accept:",
    "",
    url,
    "",
    "If you were not expecting this, you can ignore this email.",
  ].join("\n"),
  to: email,
});
