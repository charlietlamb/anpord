import { Button } from "@anpord/ui/components/button";
import type { StagedMap } from "@/lib/placements/staged-changes";
import { rollbackCount } from "@/lib/placements/staged-changes";

interface StageBarProps {
  readonly applying: boolean;
  readonly onApply: () => void;
  readonly onDiscard: () => void;
  readonly staged: StagedMap;
}

const changeCount = (count: number) =>
  `${count} ${count === 1 ? "change" : "changes"}`;

export function StageBar({
  applying,
  onApply,
  onDiscard,
  staged,
}: StageBarProps) {
  if (staged.size === 0) {
    return null;
  }

  const rollbacks = rollbackCount(staged);

  return (
    <div className="sticky bottom-0 z-20 mt-3 flex items-center gap-3 rounded-xl border border-border-surface bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
      <span className="text-sm">
        {changeCount(staged.size)} staged
        {rollbacks > 0 ? (
          <span className="text-muted-foreground">
            {" · "}
            {rollbacks} {rollbacks === 1 ? "rollback" : "rollbacks"}
          </span>
        ) : null}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <Button
          disabled={applying}
          onClick={onDiscard}
          size="sm"
          variant="ghost"
        >
          Discard
        </Button>
        <Button disabled={applying} onClick={onApply} size="sm">
          {applying ? "Applying…" : `Apply ${changeCount(staged.size)}`}
        </Button>
      </div>
    </div>
  );
}
