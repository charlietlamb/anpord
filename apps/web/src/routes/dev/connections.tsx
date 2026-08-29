import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { createFileRoute } from "@tanstack/react-router";
import { DateTime } from "effect";
import { useState } from "react";
import { PreviewScreen } from "@/components/dev/preview-screen";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ConnectionDialog } from "@/components/settings/connection-dialog";
import { ConnectionRow } from "@/components/settings/connection-row";
import { SettingsList } from "@/components/settings/settings-list";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { CONNECTION_SECTIONS } from "@/lib/settings/connection-sections";

export const Route = createFileRoute("/dev/connections")({
  component: ConnectionsPreview,
  ssr: false,
});

const at = (hoursAgo: number) =>
  DateTime.unsafeMake(1_787_000_000_000 - hoursAgo * 3_600_000);

const apiKey = (label = "API key") => ({
  fields: [{ label, name: "apiKey", required: true, secret: true }],
  id: "api-key",
  kind: "secret" as const,
  label,
});

const INTEGRATIONS: readonly CredentialIntegration[] = [
  {
    authMethods: [
      apiKey(),
      { fields: [], id: "chatgpt", kind: "device", label: "ChatGPT login" },
    ],
    category: "harness",
    id: "codex",
    label: "Codex",
  },
  {
    authMethods: [apiKey()],
    category: "harness",
    id: "claude",
    label: "Claude Code",
  },
  {
    authMethods: [apiKey()],
    category: "sandbox",
    id: "daytona",
    label: "Daytona",
  },
  {
    authMethods: [
      {
        fields: [
          {
            label: "Account id",
            name: "accountId",
            required: true,
            secret: false,
          },
          {
            label: "API token",
            name: "apiToken",
            required: true,
            secret: true,
          },
        ],
        id: "api-token",
        kind: "secret",
        label: "API token",
      },
    ],
    category: "sandbox",
    id: "cloudflare",
    label: "Cloudflare",
  },
];

const CONNECTIONS: readonly CredentialConnection[] = [
  {
    authMethodId: "api-key",
    createdAt: at(400),
    id: "conn_1",
    integrationId: "codex",
    isDefault: true,
    lastUsedAt: at(2),
    lastVerifiedAt: at(2),
    name: "Team key",
    scope: "organization",
    status: "active",
  },
  {
    authMethodId: "chatgpt",
    createdAt: at(80),
    id: "conn_2",
    integrationId: "codex",
    isDefault: false,
    lastUsedAt: null,
    lastVerifiedAt: null,
    name: "Charlie's ChatGPT",
    scope: "personal",
    status: "active",
  },
  {
    authMethodId: "api-key",
    createdAt: at(900),
    id: "conn_3",
    integrationId: "claude",
    isDefault: true,
    lastUsedAt: at(30),
    lastVerifiedAt: at(30),
    name: "Anthropic",
    scope: "organization",
    status: "invalid",
  },
  {
    authMethodId: "api-key",
    createdAt: at(300),
    id: "conn_4",
    integrationId: "daytona",
    isDefault: true,
    lastUsedAt: at(2),
    lastVerifiedAt: at(2),
    name: "Daytona",
    scope: "organization",
    status: "active",
  },
];

const noop = () => undefined;

function ConnectionsPreview() {
  const [open, setOpen] = useState<"harness" | "sandbox" | null>(null);
  const integrationOf = (connection: CredentialConnection) =>
    INTEGRATIONS.find((item) => item.id === connection.integrationId);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-10 pb-24">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 xl:px-6">
          <h1 className="font-heading text-xl tracking-tight">Connections</h1>
          <ThemeToggle />
        </div>

        <PreviewScreen name="Connections">
          <div className="mx-auto w-full max-w-3xl px-5 py-5">
            <SettingsPanel title="Connections">
              <div className="flex flex-col gap-7">
                {CONNECTION_SECTIONS.map((section) => {
                  const own = CONNECTIONS.filter(
                    (connection) =>
                      integrationOf(connection)?.category === section.category
                  );

                  return (
                    <SettingsList
                      addLabel={section.addLabel}
                      empty={own.length === 0 ? section.empty : null}
                      emptyTitle={section.emptyTitle}
                      Icon={section.Icon}
                      key={section.category}
                      onAdd={() => setOpen(section.category)}
                      title={section.title}
                    >
                      {own.map((connection) => {
                        const integration = integrationOf(connection);

                        return integration ? (
                          <ConnectionRow
                            connection={connection}
                            integration={integration}
                            key={connection.id}
                            onDefault={noop}
                            onRemove={noop}
                            onRotate={noop}
                            onVerify={noop}
                          />
                        ) : null;
                      })}
                    </SettingsList>
                  );
                })}
              </div>
            </SettingsPanel>
          </div>
        </PreviewScreen>

        <ConnectionDialog
          category={open}
          integrations={INTEGRATIONS}
          key={open ?? "closed"}
          onClose={() => setOpen(null)}
          onCreated={noop}
          open={open !== null}
        />
      </div>
    </TooltipProvider>
  );
}
