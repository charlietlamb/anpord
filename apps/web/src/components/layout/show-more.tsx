import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";
import { SpinnerGapIcon } from "@phosphor-icons/react";

/**
 * The next page, on request.
 *
 * Bare rather than outlined: it sits under the list it extends, and a bordered
 * button there reads as the end of the page rather than more of it.
 *
 * Renders nothing when there is nothing more, so a caller passes the query's
 * own flags rather than deciding for itself whether to show a control.
 */
export function ShowMore({
  className,
  hasMore,
  label,
  loading,
  onMore,
}: {
  readonly className?: string;
  readonly hasMore: boolean;
  readonly label: string;
  readonly loading: boolean;
  readonly onMore: () => void;
}) {
  if (!hasMore) {
    return null;
  }

  return (
    <Button
      className={cn(className)}
      disabled={loading}
      onClick={onMore}
      size="sm"
      variant="bare"
    >
      {loading ? <SpinnerGapIcon className="animate-spin" size={15} /> : null}
      {loading ? "Loading…" : label}
    </Button>
  );
}
