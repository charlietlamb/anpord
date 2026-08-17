import {
  GearIcon,
  type Icon,
  KeyIcon,
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
    label: "Developer",
    items: [{ label: "API keys", to: "/settings/keys", icon: KeyIcon }],
  },
];
