import {
  BracketsAngleIcon,
  BroadcastIcon,
  GearIcon,
  GitBranchIcon,
  type Icon,
  KeyIcon,
  UsersThreeIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { PROMPTS_ENABLED } from "@sphynx/schema/domain/features";

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
      {
        label: "Environment",
        to: "/settings/environment",
        icon: BracketsAngleIcon,
      },
      { label: "Codebase", to: "/settings/codebase", icon: GitBranchIcon },
    ],
  },
  {
    label: "Developer",
    items: [
      ...(PROMPTS_ENABLED
        ? [
            {
              label: "Channels",
              to: "/settings/channels",
              icon: BroadcastIcon,
            },
          ]
        : []),
      { label: "API keys", to: "/settings/keys", icon: KeyIcon },
    ],
  },
];
