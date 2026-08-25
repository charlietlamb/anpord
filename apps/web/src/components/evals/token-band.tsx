import type { EvalUsage } from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { count } from "@/lib/evals/duration";
import { percent } from "@/lib/evals/tokens";

/* A share too thin to see reads as a rendering fault rather than as a small
   number, so a present share is never drawn narrower than this. */
const FLOOR = 1.5;

const widthOf = (part: number, whole: number) => {
  if (part === 0) {
    return 0;
  }

  return Math.max((part / whole) * 100, FLOOR);
};

function Segment({
  hint,
  label,
  tone,
  tokens,
  whole,
}: {
  readonly hint: string;
  readonly label: string;
  readonly tone: string;
  readonly tokens: number;
  readonly whole: number;
}) {
  const width = widthOf(tokens, whole);

  if (width === 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="block h-full first:rounded-l-full last:rounded-r-full"
            style={{ background: tone, width: `${width}%` }}
          />
        }
      />

      <TooltipContent side="top">
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">
            {count(tokens)} {label}
          </span>
          <span className="text-xs opacity-70">{hint}</span>
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * What the model was given, split by where it came from.
 *
 * A trial's headline token count says how much context a run carried but not
 * what it cost, and those diverge by an order of magnitude: a cached read is
 * a tenth the price of fresh input. Drawn as one bar so the split is read as
 * shares of a whole rather than as three unrelated figures, and set above the
 * waterfall on the same width so a reader takes in spend and latency in one
 * pass.
 *
 * Output is left out. It is priced highest per token but is a rounding error
 * beside the context on an agent run, and at true scale it would be a sliver
 * that only makes the other two harder to compare.
 */
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

      <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-border-faint">
        <Segment
          hint="Served from the provider's cache, billed at a fraction of fresh input."
          label="cached"
          tokens={usage.cacheReadTokens}
          tone="var(--trace-cached)"
          whole={served}
        />
        <Segment
          hint="Read fresh this run, billed at the full input rate."
          label="fresh"
          tokens={usage.inputTokens}
          tone="var(--trace-fresh)"
          whole={served}
        />
        <Segment
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
