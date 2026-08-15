import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { serverUrl } from "@/lib/server/server-url";

export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ authenticated: boolean }> => {
    const baseUrl = serverUrl();
    if (!baseUrl) {
      return { authenticated: false };
    }

    const cookie = getRequest().headers.get("cookie") ?? "";
    try {
      const response = await fetch(`${baseUrl}/api/auth/get-session`, {
        headers: { cookie },
      });
      if (!response.ok) {
        return { authenticated: false };
      }
      const session = await response.json().catch(() => null);
      return { authenticated: Boolean(session?.user) };
    } catch {
      return { authenticated: false };
    }
  }
);
