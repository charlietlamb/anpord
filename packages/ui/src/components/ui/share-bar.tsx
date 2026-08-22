/**
 * A share of a whole, drawn rather than stated.
 *
 * Reading 34.5 against 95.5 is arithmetic a reader should not have to do, and
 * a bar is the same fact without the sum. Every bar in a group is drawn
 * against the same whole, so widths are comparable down the column rather than
 * each row rescaling to its own parent.
 */
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
      className="block h-0.5 w-6 shrink-0 overflow-hidden rounded-full bg-muted-foreground/20"
    >
      <span
        className="block h-full rounded-full bg-muted-foreground/60"
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}
