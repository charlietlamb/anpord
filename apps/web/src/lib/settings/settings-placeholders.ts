import type { Channel } from "@anpord/schema/domain/channels";
import type { SourceControlAccount } from "@anpord/schema/domain/codebase";
import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { ChannelName } from "@anpord/schema/domain/prompts";
import { DateTime } from "effect";
import type { MemberSummary } from "@/components/organization/member-row";
import { placeholders, placeholderText } from "@/lib/placeholders";

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

export const PLACEHOLDER_INTEGRATION: CredentialIntegration = {
  authMethods: [
    { fields: [], id: "placeholder", kind: "secret", label: "API key" },
  ],
  category: "harness",
  id: "placeholder",
  label: "Placeholder",
};

export const PLACEHOLDER_CONNECTIONS: readonly CredentialConnection[] =
  placeholders(2, (index) => ({
    authMethodId: "placeholder",
    createdAt: DateTime.unsafeMake(0),
    id: `placeholder-connection-${index}`,
    integrationId: PLACEHOLDER_INTEGRATION.id,
    isDefault: false,
    lastUsedAt: DateTime.unsafeMake(0),
    name: placeholderText(index),
    scope: "organization",
    status: "active",
  }));

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
