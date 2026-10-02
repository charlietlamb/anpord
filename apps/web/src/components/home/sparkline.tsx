import { cn } from "@sphynx/ui/lib/utils";
import type { DailyRate } from "@/lib/evals/home-trend";

const PAD = 2;

export function Sparkline({
  className,
  height = 24,
  rates,
  width = 80,
}: {
  readonly className?: string;
  readonly height?: number;
  readonly rates: readonly DailyRate[];
  readonly width?: number;
}) {
  const known = rates.filter((rate): rate is number => rate !== null);
  if (known.length < 2) {
    return null;
  }
  const low = Math.min(...known) - PAD;
  const high = Math.max(...known) + PAD;
  const points = rates
    .map((rate, index) =>
      rate === null
        ? null
        : `${(index / (rates.length - 1)) * width},${height - ((rate - low) / (high - low)) * height}`
    )
    .filter((point) => point !== null)
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0 overflow-visible", className)}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  );
}
