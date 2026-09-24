import { PROMPTS_ENABLED } from "@anpord/schema/domain/features";
import {
  ChatTextIcon,
  FlaskIcon,
  GearIcon,
  type Icon,
} from "@phosphor-icons/react";

interface NavItem {
  icon: Icon;
  label: string;
  to: string;
}

interface NavSection {
  items: NavItem[];
  label?: string;
}

export const DASHBOARD_NAV: NavSection[] = [
  { items: [{ label: "Evals", icon: FlaskIcon, to: "/evals" }] },
  ...(PROMPTS_ENABLED
    ? [{ items: [{ label: "Prompts", icon: ChatTextIcon, to: "/prompts" }] }]
    : []),
  { items: [{ label: "Settings", icon: GearIcon, to: "/settings" }] },
];

export function isNavItemActive(item: NavItem, pathname: string) {
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
