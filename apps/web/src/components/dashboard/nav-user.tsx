import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@anpord/ui/components/ui/sidebar";
import { cn } from "@anpord/ui/lib/utils";
import {
  BookOpenIcon,
  DotsThreeVerticalIcon,
  MoonIcon,
  SignOutIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import {
  IdentityAvatar,
  IdentityLabel,
} from "@/components/dashboard/sidebar-identity";
import { DOCS_URL } from "@/lib/urls";
import { useCurrentUser } from "@/lib/use-current-user";
import { useSignOut } from "@/lib/use-sign-out";

export function NavUser() {
  const { resolvedTheme, setTheme } = useTheme();
  const { state } = useSidebar();
  const user = useCurrentUser();
  const onSignOut = useSignOut();

  if (!user) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
                size="lg"
              />
            }
          >
            <IdentityAvatar
              className="size-7"
              image={user.image}
              label={user.name}
              text={user.initials}
            />
            <IdentityLabel
              className="group-data-[collapsible=icon]:hidden"
              subtitle={user.email}
              title={user.name}
            />
            <DotsThreeVerticalIcon className="ml-1 size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn(state === "collapsed" && "min-w-44")}
            side="top"
          >
            <div className="flex items-center gap-2 px-1 py-1.5">
              <IdentityAvatar
                className="size-8"
                image={user.image}
                label={user.name}
                text={user.initials}
              />
              <IdentityLabel subtitle={user.email} title={user.name} />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2">
                <UserIcon className="size-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                render={
                  <a href={DOCS_URL} rel="noreferrer" target="_blank">
                    <BookOpenIcon className="size-4" />
                    Documentation
                  </a>
                }
              />
              <DropdownMenuItem
                className="gap-2"
                closeOnClick={false}
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                <MoonIcon className="size-4" />
                Dark mode
                <DropdownMenuShortcut>T</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={onSignOut}
            >
              <SignOutIcon className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
