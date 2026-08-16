import type { Database } from "@anpord/db/client";
import { oauthApplication } from "@anpord/db/schema";
import { eq } from "drizzle-orm";

export async function findOAuthClientName(
  db: Database["Type"],
  clientId: string
): Promise<string | undefined> {
  const [client] = await db
    .select({ name: oauthApplication.name })
    .from(oauthApplication)
    .where(eq(oauthApplication.clientId, clientId))
    .limit(1);

  return client?.name;
}
