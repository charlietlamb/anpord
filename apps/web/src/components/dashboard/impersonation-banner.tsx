import { Button } from "@anpord/ui/components/button";
import { UserSwitchIcon } from "@phosphor-icons/react";
import { useSession } from "@/lib/auth-client";
import { useImpersonation } from "@/lib/use-impersonation";

/**
 * A standing reminder that this is not your account.
 *
 * Impersonation looks exactly like signing in, so without a persistent marker
 * the only difference between reading someone's data and editing it by mistake
 * is memory. It stays until impersonation ends, and carries the way out.
 */
export function ImpersonationBanner() {
  const { active, stop } = useImpersonation();
  const { data } = useSession();

  if (!active) {
    return null;
  }

  const who = data?.user?.email ?? data?.user?.name ?? "another user";

  return (
    <div className="flex items-center gap-2 border-amber-500/30 border-b bg-amber-500/10 px-4 py-1.5 text-xs">
      <UserSwitchIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
      <span className="truncate">
        Viewing as <span className="font-medium">{who}</span>
      </span>
      <Button
        className="ml-auto h-6 px-2"
        onClick={stop}
        size="sm"
        variant="outline"
      >
        Stop
      </Button>
    </div>
  );
}
