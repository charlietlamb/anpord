interface VersionLabelProps {
  readonly version: number | null;
}

export function VersionLabel({ version }: VersionLabelProps) {
  return (
    <span className="shrink-0 text-foreground tabular-nums">
      {version === null ? "a deleted version" : `v${version}`}
    </span>
  );
}
