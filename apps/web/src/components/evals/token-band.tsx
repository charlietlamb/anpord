import type { EvalUsage } from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { count } from "@/lib/evals/duration";
import { percent } from "@/lib/evals/tokens";

/* A present share is never drawn thinner than this; below it reads as a rendering fault. */
const FLOOR = 1.5;

const widthOf = (part: number, whole: number) => {
  if (part === 0) {
    return 0;
  }

  return Math.max((part / whole) * 100, FLOOR);
};

const HATCH =
  "repeating-linear-gradient(45deg, var(--trace-cached) 0 3px, transparent 3px 6px)";

function Segment({
  hatch,
  hint,
  label,
  tone,
  tokens,
  whole,
}: {
  readonly hatch?: boolean;
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
            className="block h-full first:rounded-l-[3px] last:rounded-r-[3px]"
            style={{
              backgroundColor:
                hatch === true
                  ? "color-mix(in oklch, var(--trace-cached) 22%, transparent)"
                  : tone,
              backgroundImage: hatch === true ? HATCH : undefined,
              width: `${width}%`,
            }}
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

/* Output tokens are deliberately excluded: a rounding error beside context on an agent run. */
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

      <div className="flex h-3 w-full gap-px overflow-hidden rounded-[3px] bg-border-faint">
        <Segment
          hatch
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
