import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@anpord/ui/components/ui/sidebar";
import { initials } from "@anpord/ui/lib/initials";
import { cn } from "@anpord/ui/lib/utils";
import { CaretUpDownIcon, CheckIcon, PlusIcon } from "@phosphor-icons/react";
import {
  IdentityAvatar,
  IdentityLabel,
} from "@/components/dashboard/sidebar-identity";
import { useDialog } from "@/lib/dialog/dialogs";
import { useOrganizations } from "@/lib/use-organizations";

export function OrgSwitcher() {
  const { organizations, activeOrganization, setActive } = useOrganizations();
  const { open } = useDialog();
  const { state } = useSidebar();

  const activeName = activeOrganization?.name ?? "No organization";

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
              label={activeName}
              text={initials(activeName)}
            />
            <IdentityLabel
              className="group-data-[collapsible=icon]:hidden"
              title={activeName}
            />
            <CaretUpDownIcon className="ml-1 size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={cn(state === "collapsed" && "min-w-44")}
          >
            {organizations.length > 0 ? (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Organizations
                </DropdownMenuLabel>
                {organizations.map((org) => (
                  <DropdownMenuItem
                    className="gap-2"
                    key={org.id}
                    onClick={() => setActive(org.id)}
                  >
                    <IdentityAvatar
                      className="size-6"
                      fallbackClassName="text-[0.625rem]"
                      image={org.logo}
                      label={org.name}
                      text={initials(org.name)}
                    />
                    <span className="flex-1 truncate">{org.name}</span>
                    {org.id === activeOrganization?.id ? (
                      <CheckIcon className="size-4 opacity-70" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ) : null}
            {organizations.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className="gap-2 text-muted-foreground"
              onClick={() => open("createOrganization", {})}
            >
              <PlusIcon className="size-4" />
              Create organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
