import { initials } from "@anpord/ui/lib/initials";
import { useSession } from "@/lib/auth-client";

export interface CurrentUser {
  email: string;
  image?: string | null;
  initials: string;
  name: string;
}

export function useCurrentUser(): CurrentUser | null {
  const { data: session } = useSession();
  const user = session?.user;
  if (!user) {
    return null;
  }

  const name = user.name || user.email;
  return {
    name,
    email: user.email,
    image: user.image,
    initials: initials(name, user.email),
  };
}
