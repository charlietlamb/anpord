import {
  BroadcastIcon,
  CubeIcon,
  GearIcon,
  GitBranchIcon,
  type Icon,
  KeyIcon,
  RobotIcon,
  UsersThreeIcon,
  WarningIcon,
} from "@phosphor-icons/react";

interface SettingsNavItem {
  icon: Icon;
  label: string;
  to: string;
}

export interface SettingsNavSection {
  items: SettingsNavItem[];
  label: string;
}

export const SETTINGS_NAV: SettingsNavSection[] = [
  {
    label: "Organization",
    items: [
      { label: "General", to: "/settings", icon: GearIcon },
      { label: "Members", to: "/settings/members", icon: UsersThreeIcon },
      { label: "Danger zone", to: "/settings/danger", icon: WarningIcon },
    ],
  },
  {
    label: "Connections",
    items: [
      { label: "Harnesses", to: "/settings/harnesses", icon: RobotIcon },
      { label: "Sandboxes", to: "/settings/sandboxes", icon: CubeIcon },
      { label: "Codebase", to: "/settings/codebase", icon: GitBranchIcon },
    ],
  },
  {
    label: "Developer",
    items: [
      { label: "Channels", to: "/settings/channels", icon: BroadcastIcon },
      { label: "API keys", to: "/settings/keys", icon: KeyIcon },
    ],
  },
];
