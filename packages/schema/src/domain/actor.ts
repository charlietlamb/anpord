import { Schema } from "effect";
import { Permission } from "./permissions";

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
  /** Carried on the actor rather than looked up per check, so a handler cannot
   * forget to load them and authorise against an empty set. */
  permissions: Schema.Array(Permission),
});
export type Actor = typeof Actor.Type;
