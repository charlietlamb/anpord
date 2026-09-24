export function StepTiming({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-label">
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="text-muted-foreground tabular-nums">{value}</dd>
    </div>
  );
}
