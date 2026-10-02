import {
  ChatTextIcon,
  GaugeIcon,
  GearIcon,
  HouseIcon,
  type Icon,
  StackIcon,
} from "@phosphor-icons/react";
import { PROMPTS_ENABLED } from "@sphynx/schema/domain/features";

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
  { items: [{ label: "Home", icon: HouseIcon, to: "/" }] },
  {
    label: "Evaluations",
    items: [
      { label: "Evals", icon: GaugeIcon, to: "/evals" },
      { label: "Suites", icon: StackIcon, to: "/evals/suites" },
    ],
  },
  ...(PROMPTS_ENABLED
    ? [{ items: [{ label: "Prompts", icon: ChatTextIcon, to: "/prompts" }] }]
    : []),
  {
    label: "Workspace",
    items: [{ label: "Settings", icon: GearIcon, to: "/settings" }],
  },
];

const covers = (to: string, pathname: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

export function activeNavPath(pathname: string) {
  return DASHBOARD_NAV.flatMap((section) => section.items)
    .map((item) => item.to)
    .filter((to) => covers(to, pathname))
    .reduce((deepest, to) => (to.length > deepest.length ? to : deepest), "");
}
