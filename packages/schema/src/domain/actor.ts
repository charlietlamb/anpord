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
  /** An API key acts for an organization, not a person, so there is no row in
   * `user` to attribute its writes to. Authorship columns carry a foreign key
   * to that table, so the id must not reach them. */
  isUser: Schema.Boolean,
  /** The staff member behind an impersonated session. `id` stays the person
   * being acted as, so data scoping is unchanged; this is who is really at the
   * keyboard, and the only field an audit can tell the two apart by. */
  impersonatedBy: Schema.optional(UserId),
});
export type Actor = typeof Actor.Type;

/**
 * The value authorship columns store. A key has no user to point at and those
 * columns are nullable precisely so authorship can be absent, which is the same
 * state a deleted user leaves behind.
 */
export const authorIdOf = (actor: Actor): UserId | null =>
  actor.isUser ? actor.id : null;
