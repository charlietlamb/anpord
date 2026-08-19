import {
  BroadcastIcon,
  ChatTextIcon,
  FlaskIcon,
  GearIcon,
  HouseIcon,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";

export interface NavItem {
  comingSoon?: boolean;
  icon: Icon;
  iconWeight?: IconWeight;
  label: string;
  to: string;
}

export interface NavSection {
  items: NavItem[];
  label?: string;
}

export const DASHBOARD_NAV: NavSection[] = [
  { items: [{ label: "Overview", icon: HouseIcon, to: "/" }] },
  { items: [{ label: "Prompts", icon: ChatTextIcon, to: "/prompts" }] },
  { items: [{ label: "Channels", icon: BroadcastIcon, to: "/channels" }] },
  { items: [{ label: "Evals", icon: FlaskIcon, to: "/evals" }] },
  { items: [{ label: "Settings", icon: GearIcon, to: "/settings" }] },
];

export function isNavItemActive(item: NavItem, pathname: string) {
  if (item.comingSoon) {
    return false;
  }
  if (item.to === "/") {
    return pathname === "/";
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
