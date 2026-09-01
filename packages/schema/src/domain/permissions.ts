import { Schema } from "effect";

/**
 * Permissions read `${resource}:${action}`, and write implies read: a caller
 * granted `prompts:write` passes a `prompts:read` requirement without the grant
 * being listed twice.
 */
export const Permission = Schema.Literal(
  "prompts:read",
  "prompts:write",
  "channels:read",
  "channels:write",
  "apiKeys:read",
  "apiKeys:write",
  "members:read",
  "members:write",
  "evals:read",
  "evals:write",
  "credentials:read",
  "credentials:write",
  "credentials:use",
  /** Destructive and irreversible: archiving a prompt, deleting a channel,
   * removing a member, deleting the organisation. Held by owners alone, so a
   * compromised member account cannot empty the catalogue. */
  "organization:admin",
  /** Reaches organisations the holder does not belong to, so no organisation
   * role may grant it — only {@link PLATFORM_ROLE_PERMISSIONS} does. */
  "platform:impersonate"
);

export type Permission = typeof Permission.Type;

export const Permissions = {
  Prompts: { Read: "prompts:read", Write: "prompts:write" },
  Channels: { Read: "channels:read", Write: "channels:write" },
  ApiKeys: { Read: "apiKeys:read", Write: "apiKeys:write" },
  Evals: { Read: "evals:read", Write: "evals:write" },
  Credentials: {
    Read: "credentials:read",
    Use: "credentials:use",
    Write: "credentials:write",
  },
  Members: { Read: "members:read", Write: "members:write" },
  Organization: { Admin: "organization:admin" },
  Platform: { Impersonate: "platform:impersonate" },
} as const satisfies Record<string, Record<string, Permission>>;

export const Role = Schema.Literal("owner", "admin", "member", "viewer");

export type Role = typeof Role.Type;

const READ_ONLY: readonly Permission[] = [
  "prompts:read",
  "channels:read",
  "members:read",
  "evals:read",
];

const AUTHOR: readonly Permission[] = [
  ...READ_ONLY,
  "prompts:write",
  "channels:write",
  /* Running an eval spends real money on sandboxes and model tokens, so it
     sits with the other authoring permissions rather than with reads. */
  "evals:write",
  "credentials:use",
];

/**
 * A role is a named bundle of permissions rather than a check of its own, so a
 * handler never asks "is this an admin" — it asks for the permission it needs
 * and the bundle decides. Adding a role is then additive.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  viewer: READ_ONLY,
  member: AUTHOR,
  admin: [
    ...AUTHOR,
    "apiKeys:read",
    "apiKeys:write",
    "credentials:read",
    "credentials:write",
    "members:write",
  ],
  owner: [
    ...AUTHOR,
    "apiKeys:read",
    "apiKeys:write",
    "credentials:read",
    "credentials:write",
    "members:write",
    "organization:admin",
  ],
};

/** An unrecognised role grants nothing, so a role added to the database
 * without being added here fails closed rather than opening everything. */
export const permissionsForRole = (role: string): readonly Permission[] =>
  ROLE_PERMISSIONS[role as Role] ?? [];

/**
 * What someone is on the platform, as opposed to inside one organisation.
 *
 * `member.role` only exists within an organisation, so it cannot describe
 * staff, who act across organisations they never joined and whose standing
 * must outlive being removed from any of them.
 */
export const PlatformRole = Schema.Literal("user", "admin");

export type PlatformRole = typeof PlatformRole.Type;

/** Carried by a user row with no stored role, so existing rows need no
 * backfill and a new one is never staff by accident. */
export const DEFAULT_PLATFORM_ROLE: PlatformRole = "user";

export const PLATFORM_ROLE_PERMISSIONS: Record<
  PlatformRole,
  readonly Permission[]
> = {
  user: [],
  admin: ["platform:impersonate"],
};

/** Fails closed exactly as {@link permissionsForRole} does. */
export const permissionsForPlatformRole = (
  role: string | null | undefined
): readonly Permission[] =>
  PLATFORM_ROLE_PERMISSIONS[role as PlatformRole] ?? [];

const impliedBy = (granted: Permission): readonly Permission[] =>
  granted.endsWith(":write")
    ? [granted, `${granted.slice(0, -":write".length)}:read` as Permission]
    : [granted];

export const grants = (
  held: readonly Permission[],
  required: Permission
): boolean => held.some((one) => impliedBy(one).includes(required));
