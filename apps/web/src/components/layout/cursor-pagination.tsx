import { Button } from "@anpord/ui/components/button";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

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
  /* Only where the listing paid for a count; a keyset page has none. */
  readonly pages?: number;
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
        {pages === undefined ? page : `${page}/${pages}`}
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
