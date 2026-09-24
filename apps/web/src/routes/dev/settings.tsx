import { Button } from "@anpord/ui/components/button";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PreviewScreen } from "@/components/dev/preview-screen";
import {
  CODEX,
  CONNECTIONS,
  KEYS,
  MEMBERS,
} from "@/components/dev/settings-fixtures";
import { PageHeader } from "@/components/layout/page-header";
import { MemberRow } from "@/components/organization/member-row";
import { ApiKeyList } from "@/components/settings/api-key-list";
import { ConnectionRow } from "@/components/settings/connection-row";
import { DangerZoneSettings } from "@/components/settings/danger-zone-settings";
import { InstalledAccount } from "@/components/settings/installed-account";
import { OrganizationForm } from "@/components/settings/organization-form";
import { SettingsFrame } from "@/components/settings/settings-frame";
import {
  CONNECTIONS_TABLE,
  MEMBERS_TABLE,
} from "@/lib/settings/settings-tables";

export const Route = createFileRoute("/dev/settings")({
  component: SettingsPreview,
  ssr: false,
});

const add = (label: string) => (
  <Button size="sm">
    <PlusIcon />
    {label}
  </Button>
);

function SettingsPreview() {
  return (
    <div className="flex flex-col gap-10 pb-24">
      <PreviewScreen name="General">
        <DashboardShell sidebarOpen>
          <SettingsFrame>
            <PageHeader
              description="Update your organization's name and slug."
              title="General"
            />
            <OrganizationForm name="Anpord" slug="anpord" />
          </SettingsFrame>
        </DashboardShell>
      </PreviewScreen>

      <PreviewScreen name="Members">
        <DashboardShell sidebarOpen>
          <SettingsFrame>
            <PageHeader
              actions={add("Invite member")}
              description="Manage who has access to this organization."
              title="Members"
            />
            <DataTable
              columns={MEMBERS_TABLE.columns}
              label={MEMBERS_TABLE.label}
            >
              <DataTableHead headings={MEMBERS_TABLE.headings} />
              <DataTableBody>
                {MEMBERS.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </DataTableBody>
            </DataTable>
          </SettingsFrame>
        </DashboardShell>
      </PreviewScreen>

      <PreviewScreen name="Harnesses">
        <DashboardShell sidebarOpen>
          <SettingsFrame>
            <PageHeader
              actions={add("Add harness")}
              description="The accounts agents run on."
              title="Harnesses"
            />
            <DataTable
              columns={CONNECTIONS_TABLE.columns}
              label={CONNECTIONS_TABLE.label}
            >
              <DataTableHead headings={CONNECTIONS_TABLE.headings} />
              <DataTableBody>
                {CONNECTIONS.map((row) => (
                  <ConnectionRow
                    connection={row}
                    integration={CODEX}
                    key={row.id}
                    onDefault={() => undefined}
                    onRemove={() => undefined}
                    onVerify={() => undefined}
                  />
                ))}
              </DataTableBody>
            </DataTable>
          </SettingsFrame>
        </DashboardShell>
      </PreviewScreen>

      <PreviewScreen name="API keys">
        <DashboardShell sidebarOpen>
          <SettingsFrame>
            <PageHeader
              actions={add("New key")}
              description="Authenticate the SDK and the CLI."
              title="API keys"
            />
            <ApiKeyList
              error={null}
              loading={false}
              onRevoke={() => undefined}
              rows={KEYS}
            />
          </SettingsFrame>
        </DashboardShell>
      </PreviewScreen>

      <PreviewScreen name="Codebase">
        <DashboardShell sidebarOpen>
          <SettingsFrame>
            <PageHeader description="Connect GitHub." title="Codebase" />
            <InstalledAccount
              account={{
                installationId: 1,
                login: "charlietlamb",
                manageUrl: "https://github.com",
                repositorySelection: "selected",
              }}
              onRefresh={() => undefined}
              refreshing={false}
              summary="12 repositories"
            />
          </SettingsFrame>
        </DashboardShell>
      </PreviewScreen>

      <PreviewScreen name="Danger zone">
        <DashboardShell sidebarOpen>
          <SettingsFrame>
            <DangerZoneSettings />
          </SettingsFrame>
        </DashboardShell>
      </PreviewScreen>
    </div>
  );
}
