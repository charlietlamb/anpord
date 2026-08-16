import { Schema } from "effect";

export const UserId = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand("UserId")
);
export type UserId = typeof UserId.Type;

export const OrganizationId = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand("OrganizationId")
);
export type OrganizationId = typeof OrganizationId.Type;

export const Actor = Schema.Struct({
  id: UserId,
  organizationId: OrganizationId,
});
export type Actor = typeof Actor.Type;
