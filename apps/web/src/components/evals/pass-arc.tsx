const RADIUS = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/* A hairline between neighbouring segments, so two that meet read as two
   rather than as one longer arc of a changing colour. */
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

/**
 * How a run turned out, as one ring.
 *
 * Three outcomes, three arcs, each the size of its share: passed, scored but
 * failed, and never scored at all. A single arc against a total could only
 * say how much passed, and a run that failed is not the same as one that
 * never answered -- the ring keeps them apart where a ratio cannot.
 *
 * Drawn against every trial attempted rather than every trial scored, so five
 * passes out of nine attempts is five ninths of a ring. Closing it over the
 * void would claim a perfect run out of one that mostly returned nothing.
 */
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
    /* Distinctly drawn rather than left as bare track: a run that
         scored nothing is then a visible grey ring, not an empty one. */
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

        /* Every segment starts where the last ended, drawn as one dash held
           at that offset: the gap before it is the run already covered. */
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
