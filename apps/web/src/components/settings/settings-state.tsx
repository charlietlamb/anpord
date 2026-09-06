import type { ReactNode } from "react";

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
