import type {
  PlacementTotals,
  PromptPlacements,
} from "@anpord/schema/domain/placements";
import { Button } from "@anpord/ui/components/button";
import { Input } from "@anpord/ui/components/input";
import { PlacementGrid } from "@/components/placements/placement-grid";
import { PlacementsEmpty } from "@/components/placements/placements-empty";
import { PlacementsSkeleton } from "@/components/placements/placements-skeleton";
import { StageBar } from "@/components/placements/stage-bar";
import type { StagedChange, StagedMap } from "@/lib/placements/staged-changes";

export interface PlacementsScreenProps {
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

/** Presentation only, so the dev harness renders the same screen the route
 * does rather than a copy that can drift from it. */
export function PlacementsScreen(props: PlacementsScreenProps) {
  const { applying, onApply, onDiscard, onSearch, search, staged, totals } =
    props;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col overflow-y-auto px-6 py-10">
      <div>
        <h1 className="font-heading text-2xl tracking-tight">Deployments</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Where every channel points. Change one, or many, then apply.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <Input
          aria-label="Search prompts"
          className="h-9 max-w-xs"
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search prompts"
          value={search}
        />
        {totals === null ? null : <Summary totals={totals} />}
      </div>

      <div className="mt-5">
        <PlacementsBody {...props} />
      </div>

      <StageBar
        applying={applying}
        onApply={onApply}
        onDiscard={onDiscard}
        staged={staged}
      />
    </div>
  );
}

function Summary({ totals }: { readonly totals: PlacementTotals }) {
  return (
    <p className="shrink-0 text-muted-foreground text-sm tabular-nums">
      {totals.prompts} {totals.prompts === 1 ? "prompt" : "prompts"}
      {totals.behind > 0 ? (
        <span className="text-foreground"> · {totals.behind} behind</span>
      ) : (
        " · all up to date"
      )}
    </p>
  );
}

function PlacementsBody({
  changeFor,
  channels,
  error,
  hasMore,
  isLoadingMore,
  isPending,
  onLoadMore,
  onStage,
  onStageLatest,
  rows,
  search,
}: PlacementsScreenProps) {
  if (isPending) {
    return <PlacementsSkeleton />;
  }

  if (error) {
    return (
      <p className="text-muted-foreground text-sm">
        Couldn't load your deployments. {error.message}
      </p>
    );
  }

  if (rows.length === 0) {
    return <PlacementsEmpty search={search} />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <PlacementGrid
        changeFor={changeFor}
        channels={channels}
        onStage={onStage}
        onStageLatest={onStageLatest}
        rows={rows}
      />
      {hasMore ? (
        <Button
          disabled={isLoadingMore}
          onClick={onLoadMore}
          size="sm"
          variant="outline"
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
