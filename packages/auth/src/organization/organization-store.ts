import { AutumnService } from "@anpord/billing/autumn";
import { Database } from "@anpord/db/client";
import { IdGenerator } from "@anpord/ids/id";
import { Context, Effect, Layer, Option } from "effect";
import {
  findLatestMembership,
  findMemberRole,
  findOwnerProfile,
} from "./organization-queries";
import type { OrganizationStoreError } from "./organization-store-error";
import { provisionPersonalOrganization } from "./provision-personal-organization";

export interface OrganizationStoreShape {
  readonly resolveActive: (
    userId: string
  ) => Effect.Effect<Option.Option<string>, OrganizationStoreError>;
  readonly roleOf: (
    organizationId: string,
    userId: string
  ) => Effect.Effect<Option.Option<string>, OrganizationStoreError>;
}

export class OrganizationStore extends Context.Tag(
  "@anpord/auth/OrganizationStore"
)<OrganizationStore, OrganizationStoreShape>() {}

const make = Effect.gen(function* () {
  const db = yield* Database;
  const ids = yield* IdGenerator;
  const autumn = yield* AutumnService;

  const resolveActive = (userId: string) =>
    Effect.gen(function* () {
      const membership = yield* findLatestMembership(db, userId);

      if (Option.isSome(membership)) {
        return Option.some(membership.value.organizationId);
      }

      const profile = yield* findOwnerProfile(db, userId);

      return yield* Option.match(profile, {
        onNone: () => Effect.succeedNone,
        onSome: (owner) =>
          provisionPersonalOrganization(db, ids, autumn, userId, owner).pipe(
            Effect.map(Option.some)
          ),
      });
    }).pipe(
      Effect.withSpan("OrganizationStore.resolveActive"),
      Effect.annotateLogs({ userId })
    );

  const roleOf = (organizationId: string, userId: string) =>
    findMemberRole(db, organizationId, userId).pipe(
      Effect.map(Option.map((row) => row.role)),
      Effect.withSpan("OrganizationStore.roleOf"),
      Effect.annotateLogs({ organizationId, userId })
    );

  return OrganizationStore.of({ resolveActive, roleOf });
});

export const OrganizationStoreLive = Layer.effect(OrganizationStore, make);
