import { REPOSITORY_PAGE_SIZE } from "@anpord/schema/domain/codebase";
import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { EmptyState } from "@anpord/ui/components/empty-state";
import {
  ArrowSquareOutIcon,
  DotsThreeIcon,
  GitBranchIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { GithubIcon } from "@/components/icons/github-icon";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { ROW_ACTION } from "@/components/layout/row-action";
import { RowList } from "@/components/layout/row-list";
import { ConnectionListSkeleton } from "@/components/settings/connection-list-skeleton";
import { SettingsPanel } from "@/components/settings/settings-panel";
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
  const { connecting, install, installing } = useCodebaseInstall(returned);

  if (account.isPending || connecting) {
    return (
      <SettingsPanel title="Codebase">
        <ConnectionListSkeleton rows={1} />
      </SettingsPanel>
    );
  }

  const installButton = (
    <Button disabled={installing} onClick={install} size="sm" variant="outline">
      <GithubIcon />
      {installing ? "Opening GitHub…" : "Install GitHub app"}
    </Button>
  );

  return (
    <SettingsPanel
      actions={installed === null ? undefined : installButton}
      description="Optional. Install the GitHub app to pick a repository from a list instead of pasting a URL, and to run evals against private ones."
      title="Codebase"
    >
      {installed === null ? (
        <EmptyState
          action={installButton}
          className="gap-3 py-10"
          description="Public repositories clone without one. Installing lets you choose exactly which of your own it can read."
          icon={<GitBranchIcon />}
          title="No GitHub app installed"
        />
      ) : (
        <RowList label="Source control">
          <ListRow
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      aria-label="Actions for this GitHub installation"
                      className={ROW_ACTION}
                      size="icon-sm"
                      variant="bare"
                    />
                  }
                >
                  <DotsThreeIcon />
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={repositories.isFetching}
                    onClick={() => repositories.refetch()}
                  >
                    Refresh repositories
                  </DropdownMenuItem>
                  {/* GitHub owns the picker. This is its address, which is
                      the one screen where repositories are added or removed. */}
                  <DropdownMenuItem
                    render={
                      <a
                        href={installed.manageUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Choose repositories
                        <ArrowSquareOutIcon className="ml-auto size-3.5" />
                      </a>
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            }
            leading={<GithubIcon className="size-3.5 shrink-0" />}
            meta={
              <span className="whitespace-nowrap">
                {repositoryCount(repositories.isFetching, repositories.data)}
              </span>
            }
          >
            <span className="flex min-w-0 items-center gap-2">
              <RowTitle>{installed.login}</RowTitle>

              <span className="truncate text-muted-foreground/60 text-xs">
                {installed.repositorySelection === "all"
                  ? "All repositories"
                  : "Selected repositories"}
              </span>
            </span>
          </ListRow>
        </RowList>
      )}
    </SettingsPanel>
  );
}
