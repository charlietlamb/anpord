import {
  ChatTextIcon,
  FlaskIcon,
  GearIcon,
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
  { items: [{ label: "Evals", icon: FlaskIcon, to: "/evals" }] },
  { items: [{ label: "Prompts", icon: ChatTextIcon, to: "/prompts" }] },
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
