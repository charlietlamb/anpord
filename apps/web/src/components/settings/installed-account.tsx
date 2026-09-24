import type { SourceControlAccount } from "@anpord/schema/domain/codebase";
import { DropdownMenuItem } from "@anpord/ui/components/dropdown-menu";
import { DetailList, DetailRow } from "@anpord/ui/components/ui/detail-list";
import { Surface } from "@anpord/ui/components/ui/surface";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { GithubIcon } from "@/components/icons/github-icon";
import { RowActionsMenu } from "@/components/layout/row-actions-menu";

export function InstalledAccount({
  account,
  onRefresh,
  refreshing,
  summary,
}: {
  readonly account: SourceControlAccount;
  readonly onRefresh: () => void;
  readonly refreshing: boolean;
  readonly summary: string | null;
}) {
  return (
    <Surface>
      <div className="flex h-10 items-center gap-2.5 border-border border-b px-4 text-label">
        <GithubIcon className="size-3.5 shrink-0" />
        <span className="truncate text-foreground">{account.login}</span>
        <RowActionsMenu
          className="ml-auto"
          label="Actions for this GitHub installation"
        >
          <DropdownMenuItem disabled={refreshing} onClick={onRefresh}>
            Refresh repositories
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a href={account.manageUrl} rel="noreferrer" target="_blank">
                Choose repositories
                <ArrowSquareOutIcon className="ml-auto size-3.5" />
              </a>
            }
          />
        </RowActionsMenu>
      </div>

      <DetailList bare label="GitHub installation">
        <DetailRow label="Access">
          {account.repositorySelection === "all"
            ? "All repositories"
            : "Selected repositories"}
        </DetailRow>
        <DetailRow label="Repositories">{summary ?? "—"}</DetailRow>
      </DetailList>
    </Surface>
  );
}
