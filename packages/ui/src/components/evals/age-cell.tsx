import { SignalTip } from "@anpord/ui/components/evals/signal-tip";
import { useShortAge } from "@anpord/ui/hooks/use-relative-time";
import { clock } from "@anpord/ui/lib/evals/duration";

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
