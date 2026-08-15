import type { Database } from "@anpord/db/client";
import { member } from "@anpord/db/schema/auth/members";
import { organization } from "@anpord/db/schema/auth/organizations";
import { user } from "@anpord/db/schema/auth/users";
import { desc, eq } from "drizzle-orm";

const SLUG_SUFFIX_MAX = 1_000_000;

/** Personal orgs are named after their owner, so the workspace reads as theirs. */
const displayName = (name: string | null, email: string) =>
  name?.trim() || email.split("@")[0] || "Workspace";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "workspace";

/**
 * Every session needs an organization: it scopes every query and every write.
 * Resolving it here rather than in the client means API and SDK callers get a
 * usable session too, not just someone who has loaded the dashboard.
 */
export async function resolveActiveOrganization(
  db: Database["Type"],
  userId: string
): Promise<string | undefined> {
  const [existing] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(desc(member.createdAt))
    .limit(1);

  if (existing) {
    return existing.organizationId;
  }

  const [owner] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!owner) {
    return;
  }

  const name = displayName(owner.name, owner.email);
  const organizationId = crypto.randomUUID();
  const now = new Date();

  await db.insert(organization).values({
    id: organizationId,
    name: `${name}'s Org`,
    // Slugs are unique, and two people can share a display name.
    slug: `${slugify(name)}-${Math.floor(Math.random() * SLUG_SUFFIX_MAX)}`,
    createdAt: now,
  });

  await db.insert(member).values({
    id: crypto.randomUUID(),
    organizationId,
    userId,
    role: "owner",
    createdAt: now,
  });

  return organizationId;
}
