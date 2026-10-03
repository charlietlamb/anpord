import type { Channel } from "@sphynx/schema/domain/channels";
import type { SourceControlAccount } from "@sphynx/schema/domain/codebase";
import { ChannelName } from "@sphynx/schema/domain/prompts";
import { DateTime } from "effect";
import type { MemberSummary } from "@/components/organization/member-row";
import { placeholders, placeholderText } from "@/lib/placeholders";
import type { EnvironmentRow } from "@/lib/settings/environment-rows";

const EPOCH = new Date(0);

export const PLACEHOLDER_MEMBERS: readonly MemberSummary[] = placeholders(
  3,
  (index) => ({
    createdAt: EPOCH,
    id: `placeholder-member-${index}`,
    role: "member",
    user: {
      email: `${placeholderText(index).replaceAll(" ", ".")}@example.com`,
      image: null,
      name: placeholderText(index),
    },
  })
);

export const PLACEHOLDER_API_KEYS = placeholders(3, (index) => ({
  createdAt: EPOCH,
  id: `placeholder-key-${index}`,
  name: placeholderText(index),
  start: "anp_0000",
}));

export const PLACEHOLDER_ENVIRONMENT: readonly EnvironmentRow[] = placeholders(
  3,
  (index) => ({
    kind: "variable",
    variable: {
      createdAt: DateTime.unsafeMake(0),
      id: `placeholder-variable-${index}`,
      lastUsedAt: DateTime.unsafeMake(0),
      name: "PLACEHOLDER_API_KEY",
      preview: "sk-…0000",
      revision: 1,
      scope: "organization",
      secret: true,
      updatedAt: DateTime.unsafeMake(0),
    },
  })
);

export const PLACEHOLDER_CHANNELS: readonly Channel[] = placeholders(
  3,
  (index) => ({
    color: "blue",
    createdAt: EPOCH,
    name: ChannelName.make(placeholderText(index).replaceAll(" ", "-")),
    promptCount: index,
  })
);

export const PLACEHOLDER_ACCOUNT: SourceControlAccount = {
  installationId: 0,
  login: "placeholder",
  manageUrl: "",
  repositorySelection: "selected",
};
