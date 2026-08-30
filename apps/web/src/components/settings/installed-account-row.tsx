import type { SourceControlAccount } from "@anpord/schema/domain/codebase";
import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { ArrowSquareOutIcon, DotsThreeIcon } from "@phosphor-icons/react";
import { GithubIcon } from "@/components/icons/github-icon";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { ROW_ACTION } from "@/components/layout/row-action";
import { RowList } from "@/components/layout/row-list";

/** The GitHub account an organisation clones with, and what can be done to it. */
export function InstalledAccountRow({
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
              <DropdownMenuItem disabled={refreshing} onClick={onRefresh}>
                Refresh repositories
              </DropdownMenuItem>
              {/* GitHub owns the picker. This is its address, which is the
                  one screen where repositories are added or removed. */}
              <DropdownMenuItem
                render={
                  <a href={account.manageUrl} rel="noreferrer" target="_blank">
                    Choose repositories
                    <ArrowSquareOutIcon className="ml-auto size-3.5" />
                  </a>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        }
        leading={<GithubIcon className="size-3.5 shrink-0" />}
        meta={<span className="whitespace-nowrap">{summary}</span>}
      >
        <span className="flex min-w-0 items-center gap-2">
          <RowTitle>{account.login}</RowTitle>

          <span className="truncate text-muted-foreground/60 text-xs">
            {account.repositorySelection === "all"
              ? "All repositories"
              : "Selected repositories"}
          </span>
        </span>
      </ListRow>
    </RowList>
  );
}
