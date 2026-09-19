import { useState } from "react";
import { LABEL_WIDTH } from "@/components/evals/waterfall-scale";
import { seconds } from "@/lib/evals/duration";

/* Measured against the track alone; the name gutter spans no time. */
export function useCrosshair() {
  const [percent, setPercent] = useState<number | null>(null);

  return {
    clear: () => setPercent(null),
    percent,
    track: (event: React.PointerEvent<HTMLDivElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const gutter = Number.parseFloat(LABEL_WIDTH) * 16;
      const width = bounds.width - gutter;
      const offset = event.clientX - bounds.left - gutter;

      setPercent(
        offset < 0 || width <= 0 ? null : Math.min(100, (offset / width) * 100)
      );
    },
  };
}

export function Crosshair({
  percent,
  spanMs,
}: {
  readonly percent: number | null;
  readonly spanMs: number;
}) {
  if (percent === null) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex"
    >
      <span className="shrink-0" style={{ width: LABEL_WIDTH }} />

      <div className="relative min-w-0 flex-1">
        <span
          className="absolute top-0 bottom-0 w-px bg-foreground/25"
          style={{ left: `${percent}%` }}
        />

        <span
          className="absolute -top-4 rounded-sm bg-foreground px-1 py-px text-[10px] text-background tabular-nums"
          style={{
            left: `${percent}%`,
            transform: percent > 88 ? "translateX(-100%)" : "translateX(-50%)",
          }}
        >
          {seconds(Math.round((spanMs * percent) / 100))}
        </span>
      </div>
    </div>
  );
}
