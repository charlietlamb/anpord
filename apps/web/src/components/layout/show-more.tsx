import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";
import { SpinnerGapIcon } from "@phosphor-icons/react";

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
