import { REPOSITORY_PAGE_SIZE } from "@anpord/schema/domain/codebase";
import { Button } from "@anpord/ui/components/button";
import { EmptyState } from "@anpord/ui/components/empty-state";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { GitBranchIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GithubIcon } from "@/components/icons/github-icon";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { RowList } from "@/components/layout/row-list";
import { ConnectionListSkeleton } from "@/components/settings/connection-list-skeleton";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { authClient } from "@/lib/auth-client";
import { codebaseQueries } from "@/lib/codebase-queries";

export const Route = createFileRoute("/_authed/settings/codebase")({
  component: CodebasePage,
  staticData: { title: "Codebase" },
});

/**
 * Asks GitHub for repository access, now rather than at sign-in.
 *
 * Signing in requests no scopes, so someone who only ever runs public repos
 * is never shown a consent screen asking for their private ones. `linkSocial`
 * re-runs the same provider with the scope added, which GitHub treats as an
 * upgrade to the existing grant rather than a second account.
 *
 * It answers with the URL rather than going there, so the navigation is done
 * here. GitHub's own consent screen is what grants access, and it is where
 * someone chooses which organizations to include -- an org that requires
 * approval shows a Request button beside its name.
 */
const connect = async () => {
  const result = await authClient.linkSocial({
    callbackURL: `${window.location.origin}/settings/codebase`,
    provider: "github",
    scopes: ["repo"],
  });

  if (result.error || !result.data?.url) {
    toast.error(result.error?.message ?? "Couldn't connect GitHub");
    return;
  }

  window.location.href = result.data.url;
};

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
  const [connecting, setConnecting] = useState(false);
  const account = useQuery(codebaseQueries.account());
  const repositories = useQuery(
    codebaseQueries.repositories(account.data != null)
  );

  /* Left true on the way out: the browser is leaving for GitHub, and a button
     that springs back to life first reads as a click that did nothing. */
  const start = async () => {
    setConnecting(true);
    await connect();
  };

  if (account.isPending) {
    return (
      <SettingsPanel title="Codebase">
        <ConnectionListSkeleton />
      </SettingsPanel>
    );
  }

  /* The same trip either way: GitHub's consent screen is where an
     organization is granted or revoked, and coming back reloads the page, so
     a repository added since is picked up without a refresh of its own. */
  const connectButton = (
    <Button disabled={connecting} onClick={start} size="sm" variant="outline">
      <GithubIcon />
      {account.data === null ? "Connect GitHub" : "Update access"}
    </Button>
  );

  return (
    <SettingsPanel
      actions={account.data === null ? undefined : connectButton}
      description="Optional. Connect GitHub to pick a repository from a list instead of pasting a URL, and to run evals against private ones."
      title="Codebase"
    >
      {account.data === null ? (
        <EmptyState
          action={connectButton}
          className="gap-3 py-10"
          description="Public repositories clone without one."
          icon={<GitBranchIcon />}
          title="No account connected"
        />
      ) : (
        <RowList label="Source control">
          <ListRow
            leading={<GithubIcon className="size-3.5 shrink-0" />}
            meta={
              <span className="whitespace-nowrap">
                {repositoryCount(repositories.isFetching, repositories.data)}
              </span>
            }
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <RowTitle>{account.data?.login}</RowTitle>

              {account.data?.canReadPrivate ? (
                <StatusBadge size="xs">Private repos</StatusBadge>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground/70 text-xs">
                  <LockSimpleIcon className="size-3" />
                  Public repositories only
                </span>
              )}
            </span>
          </ListRow>
        </RowList>
      )}
    </SettingsPanel>
  );
}
