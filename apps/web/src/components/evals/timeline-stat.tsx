export function TimelineStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-medium text-foreground text-sm tabular-nums">
        {value}
      </span>
      <span className="text-label text-muted-foreground/70">{label}</span>
    </span>
  );
}
