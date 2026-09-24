export function ShareBar({
  of,
  value,
}: {
  readonly of: number;
  readonly value: number;
}) {
  const percent = of === 0 ? 0 : Math.min((value / of) * 100, 100);

  return (
    <span
      aria-hidden="true"
      className="block h-1 w-8 shrink-0 overflow-hidden rounded-full bg-muted-foreground/20"
    >
      <span
        className="block h-full rounded-full bg-muted-foreground/60"
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}
