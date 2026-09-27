import { cn } from "@anpord/ui/lib/utils";
import { HomePanel } from "@/components/home/home-panel";
import type { HomeReason } from "@/lib/evals/home-view";

const SHOWN = 6;
const BAR_MAX = 110;

export function HomeReasons({
  onReason,
  reason,
  reasons,
}: {
  readonly onReason: (reason: string | null) => void;
  readonly reason: string | null;
  readonly reasons: readonly HomeReason[];
}) {
  const most = Math.max(1, ...reasons.map((entry) => entry.count));

  return (
    <HomePanel title="Why they fail">
      {reasons.length === 0 ? (
        <p className="text-[13px] text-success">Nothing is failing.</p>
      ) : (
        <ul className="-my-1 flex flex-col">
          {reasons.slice(0, SHOWN).map((entry) => (
            <li key={entry.label}>
              <button
                aria-pressed={reason === entry.label}
                className={cn(
                  "-mx-2 flex h-7 w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-md px-2 text-left text-[13px] transition-colors duration-150 hover:bg-alpha-4",
                  reason === entry.label && "bg-alpha-8 hover:bg-alpha-8"
                )}
                onClick={() =>
                  onReason(reason === entry.label ? null : entry.label)
                }
                type="button"
              >
                <span className="w-[45%] max-w-[190px] shrink-0 truncate">
                  {entry.label}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className={cn(
                      "skeleton:skeleton-paint h-1.5 rounded-full",
                      entry.kind === "check" ? "bg-destructive" : "bg-warning"
                    )}
                    style={{ width: `${(entry.count / most) * BAR_MAX}px` }}
                  />
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {entry.count}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </HomePanel>
  );
}
