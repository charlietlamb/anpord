import { Effect, Option } from "effect";
import type { OrganizationStoreShape } from "./organization-store";

interface SessionBeforeWrite {
  readonly impersonatedBy?: string | null;
  readonly userId: string;
}

export const attachOrganizationBeforeWrite =
  (organizations: OrganizationStoreShape) =>
  async (session: SessionBeforeWrite) => {
    /* Impersonation reads rather than resolves: resolving provisions a personal
       organisation for a user who has none, and that row would carry the
       target's name, outlive the impersonation, and be indistinguishable from
       one they made themselves. Staff land nowhere instead, which is honest. */
    const lookUp = session.impersonatedBy
      ? organizations.existingActive
      : organizations.resolveActive;

    /* Every cause, not just the typed ones: this runs inside a Better Auth
       database hook, so a rejection here fails the sign-in itself. A store
       that cannot answer should cost the session its organisation, not the
       person their way in. */
    const active = await Effect.runPromise(
      lookUp(session.userId).pipe(
        Effect.catchAllCause(() => Effect.succeedNone)
      )
    );

    return Option.match(active, {
      onNone: () => undefined,
      onSome: (activeOrganizationId) => ({
        data: { ...session, activeOrganizationId },
      }),
    });
  };
