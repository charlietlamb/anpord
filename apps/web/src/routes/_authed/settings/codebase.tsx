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
  /* GitHub returns here with the installation it just created. Validated so
     the value reaching the component is a number or nothing at all. */
  validateSearch: (search): { installation_id?: number } => {
    const raw = Number(search.installation_id);

    return Number.isSafeInteger(raw) && raw > 0 ? { installation_id: raw } : {};
  },
});

/* The listing is one page of the most recently pushed, so a full page is a
   floor rather than a total: saying "100 repositories" to someone with four
   hundred would be wrong. */
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
  /* Undefined while the query is failing, which reads the same as none: the
     page offers the install and says nothing it cannot stand behind. */
  const installed = account.data ?? null;
  const repositories = useQuery(
    codebaseQueries.repositories(installed !== null)
  );
  const { installation_id: returned } = Route.useSearch();
  const { connect, connecting } = useCodebaseInstall(returned);

  const loading = account.isPending || connecting;

  /* One button for both cases. It claims an installation that already exists
     and only leaves for GitHub when there is none, so the reader is never
     asked to know which of those they are in. */
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
          className="mx-auto max-h-64 w-full max-w-md flex-none gap-3 py-10"
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
      /* Withheld while loading: the empty state offers the same button, and
         which of the two is right is not known until the answer arrives. */
      actions={loading || installed === null ? undefined : connectButton}
      description="Optional. Connect GitHub to pick a repository from a list instead of pasting a URL, and to run evals against private ones."
      title="Codebase"
    >
      {panelBody()}
    </SettingsPanel>
  );
}
