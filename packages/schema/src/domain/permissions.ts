import { Schema } from "effect";

/* Write implies read, so a `prompts:write` grant is never listed alongside `prompts:read`. */
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
  /* Owners alone, so a compromised member account cannot empty the catalogue. */
  "organization:admin",
  /* Reaches organisations the holder never joined, so only PLATFORM_ROLE_PERMISSIONS grants it. */
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
  /* Spends real money on sandboxes and tokens, so it is an authoring permission. */
  "evals:write",
  "credentials:use",
];

/* Handlers ask for a permission, never for a role, so adding a role stays additive. */
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

/* An unrecognised role grants nothing, so a role missing here fails closed. */
export const permissionsForRole = (role: string): readonly Permission[] =>
  ROLE_PERMISSIONS[role as Role] ?? [];

/* Separate from `member.role`, which cannot describe staff acting across organisations they never joined. */
export const PlatformRole = Schema.Literal("user", "admin");

export type PlatformRole = typeof PlatformRole.Type;

/* Carried by a row with no stored role, so no backfill and no accidental staff. */
export const DEFAULT_PLATFORM_ROLE: PlatformRole = "user";

export const PLATFORM_ROLE_PERMISSIONS: Record<
  PlatformRole,
  readonly Permission[]
> = {
  user: [],
  admin: ["platform:impersonate"],
};

/* Fails closed exactly as permissionsForRole does. */
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
