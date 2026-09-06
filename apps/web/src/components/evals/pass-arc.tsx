const RADIUS = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SEPARATION = 1.2;

interface PassArcProps {
  readonly passed: number;
  readonly scored: number;
  readonly voided: number;
}

interface Segment {
  readonly className: string;
  readonly count: number;
  readonly key: string;
}

/* Shares are of trials attempted, not scored: closing the ring over voids would claim a perfect run. */
export function PassArc({ passed, scored, voided }: PassArcProps) {
  const attempted = scored + voided;

  if (attempted === 0) {
    return null;
  }

  const segments: readonly Segment[] = [
    { className: "stroke-success", count: passed, key: "passed" },
    {
      className: "stroke-destructive",
      count: scored - passed,
      key: "failed",
    },
    { className: "stroke-muted-foreground/50", count: voided, key: "void" },
  ];

  let turned = 0;

  return (
    <svg aria-hidden="true" className="size-3.5 -rotate-90" viewBox="0 0 16 16">
      {segments.map((segment) => {
        const length = (segment.count / attempted) * CIRCUMFERENCE;
        const offset = turned;

        turned += length;

        if (segment.count === 0) {
          return null;
        }

        /* Each segment is one dash offset by the arc already drawn, so it starts where the last ended. */
        return (
          <circle
            className={segment.className}
            cx="8"
            cy="8"
            fill="none"
            key={segment.key}
            r={RADIUS}
            strokeDasharray={`${Math.max(0, length - SEPARATION)} ${CIRCUMFERENCE}`}
            strokeDashoffset={-offset}
            strokeWidth="2.5"
          />
        );
      })}
    </svg>
  );
}
