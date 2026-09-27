import { HomePanel } from "@/components/home/home-panel";
import { seriesColor } from "@/components/home/series-color";
import type { HomeView } from "@/lib/evals/home-view";

const WIDTH = 560;
const HEIGHT = 150;
const LEFT = 34;
const RIGHT = 8;
const TOP = 10;
const BOTTOM = 20;

const ANCHORS = ["start", "middle", "end"] as const;

const dayLabel = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const labelOf = (day: string, today: string) =>
  day === today ? "Today" : dayLabel.format(new Date(`${day}T00:00:00Z`));

export function HomeTrendChart({
  trend,
}: {
  readonly trend: HomeView["trend"];
}) {
  const { axis, floor, regressedAt, series } = trend;
  const x = (index: number) =>
    LEFT + (index / Math.max(1, axis.length - 1)) * (WIDTH - LEFT - RIGHT);
  const y = (rate: number) =>
    TOP + ((100 - rate) / (100 - floor)) * (HEIGHT - TOP - BOTTOM);
  const ticks = [floor, (floor + 100) / 2, 100];
  const today = new Date().toISOString().slice(0, 10);
  const marks = [0, Math.floor((axis.length - 1) / 2), axis.length - 1];

  return (
    <HomePanel title="Pass rate">
      {series.length === 0 || axis.length < 2 ? (
        <p className="text-[13px] text-muted-foreground">
          Not enough runs to draw a trend yet.
        </p>
      ) : (
        <>
          <svg
            aria-label="Daily pass rate by variant"
            className="h-auto w-full overflow-visible text-muted-foreground/70"
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  stroke="var(--border)"
                  x1={LEFT}
                  x2={WIDTH}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text fill="currentColor" fontSize={10} x={0} y={y(tick) + 3}>
                  {tick}%
                </text>
              </g>
            ))}
            {regressedAt === null ? null : (
              <g className="text-destructive">
                <line
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                  x1={x(regressedAt)}
                  x2={x(regressedAt)}
                  y1={TOP - 4}
                  y2={HEIGHT - BOTTOM}
                />
                <text
                  fill="currentColor"
                  fontSize={10}
                  x={x(regressedAt) + 5}
                  y={TOP + 2}
                >
                  regressed
                </text>
              </g>
            )}
            {series.map((entry) => {
              const points = entry.rates
                .map((rate, day) =>
                  rate === null ? null : `${x(day)},${y(rate)}`
                )
                .filter((point) => point !== null);
              const last = entry.rates.findLastIndex((rate) => rate !== null);
              const lastRate = entry.rates[last];
              return (
                <g
                  className="skeleton:hidden"
                  key={entry.label}
                  stroke={seriesColor(entry.slot)}
                >
                  <polyline
                    fill="none"
                    points={points.join(" ")}
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                  />
                  {lastRate == null ? null : (
                    <circle
                      cx={x(last)}
                      cy={y(lastRate)}
                      fill={seriesColor(entry.slot)}
                      r={3}
                    />
                  )}
                </g>
              );
            })}
            {marks.map((mark, index) => (
              <text
                fill="currentColor"
                fontSize={10}
                key={mark}
                textAnchor={ANCHORS[index]}
                x={x(mark)}
                y={HEIGHT - 4}
              >
                {labelOf(axis[mark], today)}
              </text>
            ))}
          </svg>
          <ul className="flex flex-wrap gap-x-3.5 gap-y-1">
            {series.map((entry) => (
              <li
                className="flex items-center gap-1.5 text-muted-foreground text-xs"
                key={entry.label}
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ background: seriesColor(entry.slot) }}
                />
                <span>{entry.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </HomePanel>
  );
}
