import { apiKeyClient } from "@better-auth/api-key/client";
import {
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
  ],
});

export const { signIn, signOut, useSession } = authClient;
export { authClient };
