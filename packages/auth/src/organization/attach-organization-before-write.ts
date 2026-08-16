import { Effect, Option } from "effect";
import type { OrganizationStoreShape } from "./organization-store";

interface SessionBeforeWrite {
  readonly userId: string;
}

export const attachOrganizationBeforeWrite =
  (organizations: OrganizationStoreShape) =>
  async (session: SessionBeforeWrite) => {
    const active = await Effect.runPromise(
      organizations
        .resolveActive(session.userId)
        .pipe(Effect.catchAll(() => Effect.succeedNone))
    );

    return Option.match(active, {
      onNone: () => undefined,
      onSome: (activeOrganizationId) => ({
        data: { ...session, activeOrganizationId },
      }),
    });
  };
