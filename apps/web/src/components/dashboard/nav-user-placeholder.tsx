import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@anpord/ui/components/ui/sidebar";
import { SkeletonScope } from "@anpord/ui/components/ui/skeleton-scope";
import { NAV_USER_BUTTON } from "@/components/dashboard/nav-user-button";
import { NavUserIdentity } from "@/components/dashboard/nav-user-identity";

const PLACEHOLDER_USER = {
  email: "placeholder@example.com",
  initials: "PL",
  name: "Placeholder name",
};

export function NavUserPlaceholder() {
  return (
    <SkeletonScope>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className={NAV_USER_BUTTON} size="lg">
            <NavUserIdentity user={PLACEHOLDER_USER} />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SkeletonScope>
  );
}
