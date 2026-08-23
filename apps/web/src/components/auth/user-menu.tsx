import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@anpord/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { SignOutIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/auth-client";
import { useIsClient } from "@/lib/use-is-client";
import { useSignOut } from "@/lib/use-sign-out";

/**
 * Renders the skeleton on the server and the first client render (session state
 * isn't settled until mounted), so hydration matches and React doesn't discard
 * and regenerate the surrounding tree.
 */
export function UserMenu() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const isClient = useIsClient();
  const onSignOut = useSignOut(() => navigate({ to: "/login" }));

  if (!isClient || isPending) {
    return <Skeleton className="size-8 rounded-full" />;
  }
  if (!session?.user) {
    return null;
  }

  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "overflow-hidden rounded-full p-0"
        )}
      >
        <Avatar>
          <AvatarImage alt={user.name} src={user.image ?? undefined} />
          <AvatarFallback>{user.name[0] ?? "?"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground text-sm">
              {user.name}
            </span>
            <span className="text-muted-foreground text-xs">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <SignOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
