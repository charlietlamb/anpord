import type {
  PlacementTotals,
  PromptPlacements,
} from "@anpord/schema/domain/placements";
import { Button } from "@anpord/ui/components/button";
import { ChannelBadge } from "@anpord/ui/components/ui/channel-badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@anpord/ui/components/ui/table";
import { PlacementRow } from "@/components/placements/placement-row";
import { PlacementsSkeleton } from "@/components/placements/placements-skeleton";
import { StageBar } from "@/components/placements/stage-bar";
import type { StagedChange, StagedMap } from "@/lib/placements/staged-changes";
import { useChannelColor } from "@/lib/query/use-channel-colors";

interface PlacementsScreenProps {
  readonly applying: boolean;
  readonly changeFor: (
    promptId: string,
    channel: string
  ) => StagedChange | undefined;
  readonly channels: readonly string[];
  readonly error: Error | null;
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  readonly isPending: boolean;
  readonly onApply: () => void;
  readonly onDiscard: () => void;
  readonly onLoadMore: () => void;
  readonly onSearch: (value: string) => void;
  readonly onStage: (change: StagedChange) => void;
  readonly onStageLatest: (prompt: PromptPlacements) => void;
  readonly rows: readonly PromptPlacements[];
  readonly search: string;
  readonly staged: StagedMap;
  readonly totals: PlacementTotals | null;
}

export function PlacementsScreen(props: PlacementsScreenProps) {
  const { onSearch, search, totals } = props;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col overflow-y-auto px-6 py-10">
      <div>
        <h1 className="font-heading text-2xl tracking-tight">Deployments</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Where every channel points. Change one, or many, then apply.
        </p>
      </div>

      {totals === null ? null : (
        <p className="mt-4 text-muted-foreground text-sm">
          {totals.prompts} {totals.prompts === 1 ? "prompt" : "prompts"}
          {totals.behind > 0 ? (
            <span>
              {" · "}
              <span className="text-foreground">
                {totals.behind} behind the newest version
              </span>
            </span>
          ) : (
            " · all up to date"
          )}
        </p>
      )}

      <input
        aria-label="Search prompts"
        className="mt-5 h-9 w-full max-w-xs rounded-lg border border-border-surface bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Search prompts"
        value={search}
      />

      <PlacementsBody {...props} />
    </div>
  );
}

function PlacementsBody({
  applying,
  changeFor,
  channels,
  error,
  hasMore,
  isLoadingMore,
  isPending,
  onApply,
  onDiscard,
  onLoadMore,
  onStage,
  onStageLatest,
  rows,
  search,
  staged,
}: PlacementsScreenProps) {
  const channelColor = useChannelColor();

  if (isPending) {
    return <PlacementsSkeleton />;
  }

  if (error) {
    return (
      <p className="mt-6 text-muted-foreground text-sm">
        Couldn't load your deployments. {error.message}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-border-surface border-dashed px-6 py-14 text-center">
        <p className="font-heading text-base tracking-tight">
          {search === "" ? "No prompts yet" : "No matching prompts"}
        </p>
        <p className="mt-1 text-muted-foreground text-sm">
          {search === ""
            ? "Create one to start versioning what your application sends."
            : `Nothing matches "${search}".`}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border-surface bg-sidebar-accent">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-sidebar-accent">
                Prompt
              </TableHead>
              <TableHead>Latest</TableHead>
              {channels.map((channel) => (
                <TableHead key={channel}>
                  <ChannelBadge
                    color={channelColor(channel)}
                    name={channel}
                    size="xs"
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((prompt) => (
              <PlacementRow
                changeFor={changeFor}
                channels={channels}
                key={prompt.id}
                onStage={onStage}
                onStageLatest={onStageLatest}
                prompt={prompt}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {hasMore ? (
        <Button
          className="mt-4 self-center"
          disabled={isLoadingMore}
          onClick={onLoadMore}
          size="sm"
          variant="outline"
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}

      <StageBar
        applying={applying}
        onApply={onApply}
        onDiscard={onDiscard}
        staged={staged}
      />
    </>
  );
}
