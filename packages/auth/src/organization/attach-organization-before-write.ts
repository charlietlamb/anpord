import { Effect, Option } from "effect";
import type { OrganizationStoreShape } from "./organization-store";

interface SessionBeforeWrite {
  readonly impersonatedBy?: string | null;
  readonly userId: string;
}

export const attachOrganizationBeforeWrite =
  (organizations: OrganizationStoreShape) =>
  async (session: SessionBeforeWrite) => {
    /* Impersonation reads rather than resolves: resolving would provision a
       personal organisation in the target's name that outlives the session. */
    const lookUp = session.impersonatedBy
      ? organizations.existingActive
      : organizations.resolveActive;

    /* Every cause: this runs in a Better Auth database hook, where a rejection
       fails the sign-in itself. */
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
