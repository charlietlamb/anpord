import { REPOSITORY_PAGE_SIZE } from "@anpord/schema/domain/codebase";
import { Button } from "@anpord/ui/components/button";
import { EmptyState } from "@anpord/ui/components/empty-state";
import { GitBranchIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { GithubIcon } from "@/components/icons/github-icon";
import { ConnectionListSkeleton } from "@/components/settings/connection-list-skeleton";
import { InstalledAccountRow } from "@/components/settings/installed-account-row";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { SettingsState } from "@/components/settings/settings-state";
import { codebaseQueries } from "@/lib/codebase-queries";
import { useCodebaseInstall } from "@/lib/use-codebase-install";

export const Route = createFileRoute("/_authed/settings/codebase")({
  component: CodebasePage,
  staticData: { title: "Codebase" },
  validateSearch: (search): { installation_id?: number } => {
    const raw = Number(search.installation_id);

    return Number.isSafeInteger(raw) && raw > 0 ? { installation_id: raw } : {};
  },
});

/* The listing is a single page, so a full page is a floor rather than a total. */
const repositoryCount = (
  fetching: boolean,
  repositories: readonly unknown[] | undefined
) => {
  if (fetching) {
    return "Refreshing…";
  }
  if (repositories === undefined) {
    return null;
  }
  return repositories.length < REPOSITORY_PAGE_SIZE
    ? `${repositories.length} repositories`
    : `${REPOSITORY_PAGE_SIZE}+ repositories`;
};

function CodebasePage() {
  const account = useQuery(codebaseQueries.account());
  const installed = account.data ?? null;
  const repositories = useQuery(
    codebaseQueries.repositories(installed !== null)
  );
  const { installation_id: returned } = Route.useSearch();
  const { connect, connecting } = useCodebaseInstall(returned);

  const loading = account.isPending || connecting;

  const connectButton = (
    <Button disabled={connecting} onClick={connect} size="sm" variant="outline">
      <GithubIcon />
      {connecting ? "Connecting…" : "Connect GitHub"}
    </Button>
  );

  const panelBody = () => {
    if (loading || account.error) {
      return (
        <SettingsState
          error={account.error}
          skeleton={<ConnectionListSkeleton rows={1} />}
        />
      );
    }

    if (installed === null) {
      return (
        <EmptyState
          action={connectButton}
          className="m-auto max-h-64 w-full max-w-md flex-none gap-3 py-10"
          description="Public repositories clone without it. Connecting lets you choose exactly which of your own it can read."
          icon={<GitBranchIcon />}
          title="GitHub not connected"
        />
      );
    }

    return (
      <InstalledAccountRow
        account={installed}
        onRefresh={() => repositories.refetch()}
        refreshing={repositories.isFetching}
        summary={repositoryCount(repositories.isFetching, repositories.data)}
      />
    );
  };

  return (
    <SettingsPanel
      actions={loading || installed === null ? undefined : connectButton}
      description="Optional. Connect GitHub to pick a repository from a list instead of pasting a URL, and to run evals against private ones."
      title="Codebase"
    >
      {panelBody()}
    </SettingsPanel>
  );
}
