import { REPOSITORY_PAGE_SIZE } from "@anpord/schema/domain/codebase";
import { Button } from "@anpord/ui/components/button";
import { GitBranchIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { GithubIcon } from "@/components/icons/github-icon";
import { ListState } from "@/components/layout/list-state";
import { PageHeader } from "@/components/layout/page-header";
import { InstalledAccount } from "@/components/settings/installed-account";
import { codebaseQueries } from "@/lib/codebase-queries";
import { PLACEHOLDER_ACCOUNT } from "@/lib/settings/settings-placeholders";
import { useCodebaseInstall } from "@/lib/use-codebase-install";

export const Route = createFileRoute("/_authed/settings/codebase")({
  component: CodebasePage,
  staticData: { title: "Codebase" },
  validateSearch: (search): { installation_id?: number } => {
    const raw = Number(search.installation_id);

    return Number.isSafeInteger(raw) && raw > 0 ? { installation_id: raw } : {};
  },
});

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

  return (
    <>
      <PageHeader
        actions={loading || installed === null ? undefined : connectButton}
        description="Optional. Connect GitHub to pick a repository from a list instead of pasting a URL, and to run evals against private ones."
        title="Codebase"
      />
      <ListState
        action={connectButton}
        description="Public repositories clone without it. Connecting lets you choose exactly which of your own it can read."
        empty={installed === null}
        error={account.error}
        icon={<GitBranchIcon />}
        loading={loading}
        title="GitHub not connected"
      >
        <InstalledAccount
          account={installed ?? PLACEHOLDER_ACCOUNT}
          onRefresh={() => repositories.refetch()}
          refreshing={repositories.isFetching}
          summary={repositoryCount(repositories.isFetching, repositories.data)}
        />
      </ListState>
    </>
  );
}
