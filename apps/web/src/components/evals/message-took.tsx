import { seconds } from "@/lib/evals/duration";

export function MessageTook({ ms }: { readonly ms: number | null }) {
  if (ms === null || ms === 0) {
    return null;
  }

  return (
    <span className="px-1 text-muted-foreground text-xs tabular-nums">
      {seconds(ms)}
    </span>
  );
}
