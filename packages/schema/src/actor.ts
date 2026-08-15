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

/**
 * Who is acting, and the organization every operation is scoped to. Branding
 * both ids makes them impossible to transpose, since each is otherwise a bare
 * string. Not auth-specific: an API key resolves to an actor too.
 */
export const Actor = Schema.Struct({
  id: UserId,
  organizationId: OrganizationId,
});
export type Actor = typeof Actor.Type;
