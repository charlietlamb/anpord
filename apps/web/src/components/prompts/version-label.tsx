interface VersionLabelProps {
  /** Null once the version is gone: the event outlives what it describes,
   * which is the point of keeping it. */
  readonly version: number | null;
}

export function VersionLabel({ version }: VersionLabelProps) {
  return (
    <span className="shrink-0 text-foreground tabular-nums">
      {version === null ? "a deleted version" : `v${version}`}
    </span>
  );
}
