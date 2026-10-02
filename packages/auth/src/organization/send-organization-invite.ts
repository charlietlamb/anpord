import { organizationInviteEmail } from "@sphynx/notifications/email/organization-invite";
import type { EmailSenderShape } from "@sphynx/notifications/email/sender";
import { WEB_ORIGIN } from "@sphynx/schema/public/origins";
import { Effect } from "effect";

interface InvitationRequest {
  readonly email: string;
  readonly id: string;
  readonly inviter: {
    readonly user: { readonly email: string; readonly name: string | null };
  };
  readonly organization: { readonly name: string };
}

const inviteUrl = (id: string) => `${WEB_ORIGIN}/invitations/${id}`;

const invitedBy = (inviter: InvitationRequest["inviter"]) =>
  inviter.user.name ?? inviter.user.email;

export const sendOrganizationInvite =
  (emails: EmailSenderShape) =>
  ({ email, id, inviter, organization }: InvitationRequest) =>
    Effect.runPromise(
      emails
        .send(
          organizationInviteEmail({
            email,
            invitedBy: invitedBy(inviter),
            organization: organization.name,
            url: inviteUrl(id),
          })
        )
        .pipe(
          Effect.tapErrorCause(Effect.logError),
          Effect.mapError(
            () =>
              new Error(
                "The invitation could not be sent. Try again, and if it keeps failing the address may be unreachable."
              )
          )
        )
    );
