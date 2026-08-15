import {
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  plugins: [organizationClient(), magicLinkClient()],
});

export const { signIn, signOut, useSession } = authClient;
export { authClient };
