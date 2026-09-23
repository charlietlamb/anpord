import { cn } from "@anpord/ui/lib/utils";
import { BAR } from "@/components/evals/waterfall-scale";
import { KIND_COLOURS, kindOf } from "@/lib/evals/journal-presentation";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

const MIN_BAR = 3;

const THINKING =
  "repeating-linear-gradient(135deg, var(--muted-foreground) 0 1px, transparent 1px 4px)";

const CENTRED = "absolute top-1/2 block -translate-y-1/2";

const LIT =
  "transition-[filter] duration-150 ease-out group-hover:brightness-110 group-focus-visible:brightness-110 motion-reduce:transition-none";

export function Track({ row }: { readonly row: WaterfallRow }) {
  const background = KIND_COLOURS[kindOf(row)];

  return (
    <>
      {row.lead === null ? null : (
        <span
          className={cn(CENTRED, "h-2 rounded-sm opacity-40")}
          style={{
            background: THINKING,
            left: `${row.lead.fromPercent}%`,
            width: `${row.lead.widthPercent}%`,
          }}
        />
      )}

      {row._tag === "bar" ? (
        <span
          className={cn(
            CENTRED,
            BAR,
            LIT,
            row.running === true && "animate-pulse motion-reduce:animate-none"
          )}
          style={{
            background,
            left: `${row.leftPercent}%`,
            minWidth: MIN_BAR,
            width: `${row.widthPercent}%`,
          }}
        />
      ) : (
        <span
          className={cn(CENTRED, LIT, "size-2.5 -translate-x-1/2 rounded-full")}
          style={{ background, left: `${row.leftPercent}%` }}
        />
      )}
    </>
  );
}
