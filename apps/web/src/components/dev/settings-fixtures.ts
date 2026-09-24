import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { DateTime } from "effect";
import type { MemberSummary } from "@/components/organization/member-row";

const NOW = Date.UTC(2026, 8, 22, 9, 0);
const DAY = 86_400_000;

export const CODEX: CredentialIntegration = {
  authMethods: [
    { fields: [], id: "chatgpt", kind: "device", label: "ChatGPT account" },
    {
      fields: [
        {
          hint: "sk-…",
          label: "API key",
          name: "apiKey",
          required: true,
          secret: true,
        },
      ],
      id: "api-key",
      kind: "secret",
      label: "API key",
    },
  ],
  category: "harness",
  id: "codex",
  label: "Codex",
};

const connection = (
  overrides: Partial<CredentialConnection>
): CredentialConnection => ({
  authMethodId: "api-key",
  createdAt: DateTime.unsafeMake(NOW - 20 * DAY),
  id: "con_1",
  integrationId: "codex",
  isDefault: false,
  lastUsedAt: DateTime.unsafeMake(NOW - 2 * DAY),
  name: "Team key",
  scope: "organization",
  status: "active",
  ...overrides,
});

export const CONNECTIONS = [
  connection({ id: "con_1", isDefault: true }),
  connection({
    authMethodId: "chatgpt",
    id: "con_2",
    lastUsedAt: null,
    name: "Charlie's ChatGPT",
    scope: "personal",
  }),
  connection({ id: "con_3", name: "Old key", status: "invalid" }),
];

export const MEMBERS = [
  {
    createdAt: new Date(NOW - 40 * DAY),
    id: "mem_1",
    role: "owner",
    user: { email: "charlie@anpord.com", image: null, name: "Charlie Lamb" },
  },
  {
    createdAt: new Date(NOW - 3 * DAY),
    id: "mem_2",
    role: "member",
    user: { email: "sam@anpord.com", image: null, name: "" },
  },
] satisfies readonly MemberSummary[];

export const KEYS = [
  { createdAt: new Date(NOW - DAY), id: "key_1", name: "CI", start: "anp_7Kq" },
  {
    createdAt: new Date(NOW - 30 * DAY),
    id: "key_2",
    name: "Local laptop",
    start: "anp_3Xw",
  },
];
