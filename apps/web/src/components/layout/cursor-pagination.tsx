import { Button } from "@anpord/ui/components/button";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

/**
 * Pages a cursor listing, one step at a time.
 *
 * Numbered pages would need a count, and counting rows a listing has not read
 * costs a second query over the whole table for a number nobody acts on. What
 * a reader needs is where they are and whether there is more, and a cursor
 * answers both.
 *
 * Hidden on a listing that fits one page: a control that can never move is
 * furniture.
 */
export function CursorPagination({
  canGoNext,
  canGoPrev,
  disabled,
  onNext,
  onPrev,
  page,
}: {
  readonly canGoNext: boolean;
  readonly canGoPrev: boolean;
  readonly disabled: boolean;
  readonly onNext: () => void;
  readonly onPrev: () => void;
  readonly page: number;
}) {
  if (!(canGoNext || canGoPrev)) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        aria-label="Previous page"
        disabled={disabled || !canGoPrev}
        onClick={onPrev}
        size="icon-sm"
        variant="outline"
      >
        <CaretLeftIcon className="size-3.5" />
      </Button>

      <span className="min-w-5 text-center text-muted-foreground/70 text-xs tabular-nums">
        {page}
      </span>

      <Button
        aria-label="Next page"
        disabled={disabled || !canGoNext}
        onClick={onNext}
        size="icon-sm"
        variant="outline"
      >
        <CaretRightIcon className="size-3.5" />
      </Button>
    </div>
  );
}
