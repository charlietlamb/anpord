import { Button } from "@anpord/ui/components/button";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";

export function CursorPagination({
  canGoNext,
  canGoPrev,
  disabled,
  onNext,
  onPrev,
  page,
  pages,
}: {
  readonly canGoNext: boolean;
  readonly canGoPrev: boolean;
  readonly disabled: boolean;
  readonly onNext: () => void;
  readonly onPrev: () => void;
  readonly page: number;
  readonly pages?: number;
}) {
  if (pages === undefined && !(canGoNext || canGoPrev)) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        aria-label="Previous page"
        disabled={disabled || !canGoPrev}
        onClick={onPrev}
        size="icon-sm"
        variant="ghost"
      >
        <ArrowLeftIcon />
      </Button>

      <span className="min-w-10 text-center text-muted-foreground text-xs tabular-nums">
        {pages === undefined ? page : `${page} / ${pages}`}
      </span>

      <Button
        aria-label="Next page"
        disabled={disabled || !canGoNext}
        onClick={onNext}
        size="icon-sm"
        variant="ghost"
      >
        <ArrowRightIcon />
      </Button>
    </div>
  );
}
