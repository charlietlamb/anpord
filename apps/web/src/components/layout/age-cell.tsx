import { SignalTip } from "@/components/evals/signal-tip";
import { clock } from "@/lib/evals/duration";
import { useShortAge } from "@/lib/use-relative-time";

export function AgeCell({ at }: { readonly at: number | null }) {
  const age = useShortAge(new Date(at ?? 0));

  return (
    <span className="text-muted-foreground tabular-nums">
      {age === null || at === null ? null : (
        <SignalTip className="whitespace-nowrap" label={clock(at)}>
          {age} ago
        </SignalTip>
      )}
    </span>
  );
}
