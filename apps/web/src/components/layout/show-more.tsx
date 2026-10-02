import { SpinnerGapIcon } from "@phosphor-icons/react";
import { Button } from "@sphynx/ui/components/button";
import { SPIN } from "@sphynx/ui/lib/utils";

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
      className={className}
      disabled={loading}
      onClick={onMore}
      size="sm"
      variant="bare"
    >
      {loading ? <SpinnerGapIcon className={SPIN} /> : null}
      {loading ? "Loading…" : label}
    </Button>
  );
}
