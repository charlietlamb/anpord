import { Button } from "@sphynx/ui/components/button";
import { EmptyNote } from "@sphynx/ui/components/ui/empty-note";

export function ArtifactPending({
  onRetry,
  pending,
}: {
  readonly onRetry: () => void;
  readonly pending: boolean;
}) {
  return pending ? (
    <EmptyNote>Loading file…</EmptyNote>
  ) : (
    <div className="flex justify-center py-4">
      <Button onClick={onRetry} size="sm" variant="ghost">
        Couldn't load this file. Retry
      </Button>
    </div>
  );
}
