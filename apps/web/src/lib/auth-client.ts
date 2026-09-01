import { apiKeyClient } from "@better-auth/api-key/client";
import {
  adminClient,
  magicLinkClient,
  oidcClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    magicLinkClient(),
    oidcClient(),
    apiKeyClient(),
    adminClient(),
  ],
});

export const { signIn, signOut, useSession } = authClient;
export { authClient };
