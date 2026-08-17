import { Schema } from "effect";

/**
 * Permissions read `${resource}:${action}`, and write implies read: a caller
 * granted `prompts:write` passes a `prompts:read` requirement without the grant
 * being listed twice.
 */
export const RESOURCES = ["prompts", "channels", "apiKeys", "members"] as const;

export type Resource = (typeof RESOURCES)[number];

export const Permission = Schema.Literal(
  "prompts:read",
  "prompts:write",
  "channels:read",
  "channels:write",
  "apiKeys:read",
  "apiKeys:write",
  "members:read",
  "members:write",
  /** Destructive and irreversible: archiving a prompt, deleting a channel,
   * removing a member, deleting the organisation. Held by owners alone, so a
   * compromised member account cannot empty the catalogue. */
  "organization:admin"
);

export type Permission = typeof Permission.Type;

export const Permissions = {
  Prompts: { Read: "prompts:read", Write: "prompts:write" },
  Channels: { Read: "channels:read", Write: "channels:write" },
  ApiKeys: { Read: "apiKeys:read", Write: "apiKeys:write" },
  Members: { Read: "members:read", Write: "members:write" },
  Organization: { Admin: "organization:admin" },
} as const satisfies Record<string, Record<string, Permission>>;

export const Role = Schema.Literal("owner", "admin", "member", "viewer");

export type Role = typeof Role.Type;

const READ_ONLY: readonly Permission[] = [
  "prompts:read",
  "channels:read",
  "members:read",
];

const AUTHOR: readonly Permission[] = [
  ...READ_ONLY,
  "prompts:write",
  "channels:write",
];

/**
 * A role is a named bundle of permissions rather than a check of its own, so a
 * handler never asks "is this an admin" — it asks for the permission it needs
 * and the bundle decides. Adding a role is then additive.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  viewer: READ_ONLY,
  member: AUTHOR,
  admin: [...AUTHOR, "apiKeys:read", "apiKeys:write", "members:write"],
  owner: [
    ...AUTHOR,
    "apiKeys:read",
    "apiKeys:write",
    "members:write",
    "organization:admin",
  ],
};

/** An unrecognised role grants nothing, so a role added to the database
 * without being added here fails closed rather than opening everything. */
export const permissionsForRole = (role: string): readonly Permission[] =>
  ROLE_PERMISSIONS[role as Role] ?? [];

const impliedBy = (granted: Permission): readonly Permission[] =>
  granted.endsWith(":write")
    ? [granted, `${granted.slice(0, -":write".length)}:read` as Permission]
    : [granted];

export const grants = (
  held: readonly Permission[],
  required: Permission
): boolean => held.some((one) => impliedBy(one).includes(required));
