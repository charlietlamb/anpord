import { Button } from "@anpord/ui/components/button";
import { EmptyState } from "@anpord/ui/components/empty-state";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { GitBranchIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GithubIcon } from "@/components/icons/github-icon";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { RowList } from "@/components/layout/row-list";
import { ConnectionListSkeleton } from "@/components/settings/connection-list-skeleton";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { authClient } from "@/lib/auth-client";
import { codebaseKeys, codebaseQueries } from "@/lib/codebase-queries";

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
 */
const connect = async () => {
  const result = await authClient.linkSocial({
    callbackURL: "/settings/codebase",
    provider: "github",
    scopes: ["repo"],
  });

  if (result.error) {
    toast.error(result.error.message ?? "Couldn't connect GitHub");
  }
};

function CodebasePage() {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const account = useQuery(codebaseQueries.account());
  const repositories = useQuery(
    codebaseQueries.repositories(account.data != null)
  );

  const start = async () => {
    setConnecting(true);
    await connect();
    setConnecting(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: codebaseKeys.account() }),
      queryClient.invalidateQueries({ queryKey: codebaseKeys.repositories() }),
    ]);
  };

  if (account.isPending) {
    return (
      <SettingsPanel>
        <ConnectionListSkeleton />
      </SettingsPanel>
    );
  }

  const connectButton = (
    <Button disabled={connecting} onClick={start} size="sm" variant="outline">
      <GithubIcon />
      {account.data ? "Grant repository access" : "Connect GitHub"}
    </Button>
  );

  return (
    <SettingsPanel>
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-medium text-sm">Source control</h2>
            <p className="max-w-prose text-muted-foreground text-xs">
              Optional. Connect GitHub to pick a repository from a list instead
              of pasting a URL, and to run evals against private ones.
            </p>
          </div>

          {account.data?.canReadPrivate ? null : connectButton}
        </div>

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
                  {repositories.data === undefined
                    ? null
                    : `${repositories.data.length} repositories`}
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
      </section>
    </SettingsPanel>
  );
}
