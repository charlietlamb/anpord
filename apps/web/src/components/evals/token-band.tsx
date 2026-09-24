import type { EvalUsage } from "@anpord/schema/domain/evals";
import { TokenSegment } from "@/components/evals/token-segment";
import { percent } from "@/lib/evals/tokens";

export function TokenBand({ usage }: { readonly usage: EvalUsage }) {
  const served =
    usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;

  if (served === 0) {
    return null;
  }

  const hit = usage.cacheReadTokens / served;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground text-xs">Context</span>

        <span className="text-muted-foreground text-xs tabular-nums">
          {usage.cacheReadTokens === 0 ? null : (
            <span className="text-foreground">{percent(hit)} cached</span>
          )}
        </span>
      </div>

      <div className="flex h-3 w-full gap-px overflow-hidden rounded-[3px] bg-border">
        <TokenSegment
          hatch
          hint="Served from the provider's cache, billed at a fraction of fresh input."
          label="cached"
          tokens={usage.cacheReadTokens}
          tone="var(--trace-cached)"
          whole={served}
        />
        <TokenSegment
          hint="Read fresh this run, billed at the full input rate."
          label="fresh"
          tokens={usage.inputTokens}
          tone="var(--trace-fresh)"
          whole={served}
        />
        <TokenSegment
          hint="Written to the cache this run, so a later run can read it cheaply."
          label="written to cache"
          tokens={usage.cacheWriteTokens}
          tone="var(--trace-thinking)"
          whole={served}
        />
      </div>
    </div>
  );
}
