import type { EvalTally } from "@anpord/schema/domain/evals";
import { cn } from "@anpord/ui/lib/utils";

const MOST = 10;

export function PassBars({ tally }: { readonly tally: EvalTally }) {
  const { passed, scored } = tally;

  if (scored === 0) {
    return <span className="text-muted-foreground/70">Not scored</span>;
  }

  const shown = Math.min(scored, MOST);
  const green = Math.round((passed / scored) * shown);

  return (
    <span
      aria-label={`${passed} of ${scored} passed`}
      className="flex items-center gap-2"
      role="img"
    >
      <span aria-hidden="true" className="flex items-center gap-0.5">
        {Array.from({ length: shown }, (_, square) => (
          <span
            className={cn(
              "size-2.5 rounded-[3px]",
              square < green ? "bg-success" : "bg-destructive"
            )}
            key={`${square satisfies number}`}
          />
        ))}
      </span>
      <span aria-hidden="true" className="text-muted-foreground tabular-nums">
        {passed}/{scored}
      </span>
    </span>
  );
}
