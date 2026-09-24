import { Button } from "@anpord/ui/components/button";
import { UserSwitchIcon } from "@phosphor-icons/react";
import { useSession } from "@/lib/auth-client";
import { useImpersonation } from "@/lib/use-impersonation";

export function ImpersonationBanner() {
  const { active, stop } = useImpersonation();
  const { data } = useSession();

  if (!active) {
    return null;
  }

  const who = data?.user?.email ?? data?.user?.name ?? "another user";

  return (
    <div className="flex items-center gap-2 border-warning/25 border-b bg-warning/10 px-4 py-1.5 text-xs">
      <UserSwitchIcon className="size-3.5 shrink-0 text-warning" />
      <span className="truncate">
        Viewing as <span className="font-medium">{who}</span>
      </span>
      <Button className="ml-auto" onClick={stop} size="sm" variant="outline">
        Stop
      </Button>
    </div>
  );
}
