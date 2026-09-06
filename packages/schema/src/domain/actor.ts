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
  /* Carried on the actor, so a handler cannot authorise against an unloaded empty set. */
  permissions: Schema.Array(Permission),
  /* False for an API key, whose id has no `user` row and must not reach the authorship foreign keys. */
  isUser: Schema.Boolean,
  /* `id` stays the person being acted as, so scoping is unchanged; this is the only field an audit can separate them by. */
  impersonatedBy: Schema.optional(UserId),
});
export type Actor = typeof Actor.Type;

/* Authorship columns are nullable precisely so a key's absent author matches a deleted user's. */
export const authorIdOf = (actor: Actor): UserId | null =>
  actor.isUser ? actor.id : null;
