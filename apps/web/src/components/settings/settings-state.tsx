import type { ReactNode } from "react";

/**
 * What a settings list shows before its rows arrive, or instead of them.
 *
 * Only the list swaps: the panel around this keeps its heading, description
 * and action, all of which are known before the fetch. Three pages had each
 * decided otherwise and returned a bare panel while loading, so the header
 * appeared a line at a time as the data landed.
 */
export function SettingsState({
  error,
  skeleton,
}: {
  readonly error: Error | null;
  readonly skeleton: ReactNode;
}) {
  if (error) {
    return (
      <p className="text-muted-foreground text-sm">
        {error.message || "Couldn't load this."}
      </p>
    );
  }

  return <>{skeleton}</>;
}
