import { REPOSITORY_PAGE_SIZE } from "@anpord/schema/domain/codebase";
import { Button } from "@anpord/ui/components/button";
import { EmptyState } from "@anpord/ui/components/empty-state";
import { GitBranchIcon } from "@phosphor-icons/react";
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
 * The client's own redirect plugin navigates on a response carrying a url
 * and `redirect: true`, which is what this endpoint returns. It is not relied
 * on: the url is followed here too, because a hook that quietly does not run
 * leaves a button that looks broken and says nothing, and navigating twice to
 * the same place costs nothing.
 *
 * GitHub's own consent screen is what grants access, and it is where someone
 * chooses which organizations to include -- one that requires approval shows
 * a Request button beside its name.
 */
const connect = async () => {
  const { data, error } = await authClient.linkSocial({
    callbackURL: `${window.location.origin}/settings/codebase`,
    provider: "github",
    scopes: ["repo"],
  });

  if (error || !data?.url) {
    toast.error(error?.message ?? "Couldn't reach GitHub");
    return;
  }

  window.location.assign(data.url);
};

/* The browser is on its way to GitHub, which takes a moment on a slow
   connection; a button that only greys out reads as a click that missed. */
const connectLabel = (connecting: boolean, fresh: boolean) => {
  if (connecting) {
    return "Opening GitHub…";
  }
  return fresh ? "Connect GitHub" : "Update access";
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
        <ConnectionListSkeleton rows={1} />
      </SettingsPanel>
    );
  }

  /* The same trip either way: GitHub's consent screen is where an
     organization is granted or revoked, and coming back reloads the page, so
     a repository added since is picked up without a refresh of its own. */
  const connectButton = (
    <Button disabled={connecting} onClick={start} size="sm" variant="outline">
      <GithubIcon />
      {connectLabel(connecting, account.data === null)}
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
            <span className="flex min-w-0 items-center gap-2">
              <RowTitle>{account.data?.login}</RowTitle>

              {/* Said the same way the harness rows say their method: one
                  muted line beside the name, rather than a badge for the
                  ordinary case and an icon-and-text fragment for the other. */}
              <span className="truncate text-muted-foreground/60 text-xs">
                {account.data?.canReadPrivate
                  ? "Public and private"
                  : "Public repositories only"}
              </span>
            </span>
          </ListRow>
        </RowList>
      )}
    </SettingsPanel>
  );
}
