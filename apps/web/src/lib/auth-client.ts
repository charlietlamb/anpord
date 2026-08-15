import {
  magicLinkClient,
  oidcClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  plugins: [organizationClient(), magicLinkClient(), oidcClient()],
});

export const { signIn, signOut, useSession } = authClient;
export { authClient };
