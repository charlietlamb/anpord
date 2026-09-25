import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { count } from "@anpord/ui/lib/evals/duration";

const FLOOR = 1.5;

const widthOf = (part: number, whole: number) => {
  if (part === 0) {
    return 0;
  }

  return Math.max((part / whole) * 100, FLOOR);
};

const HATCH =
  "repeating-linear-gradient(45deg, var(--trace-cached) 0 3px, transparent 3px 6px)";

export function TokenSegment({
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
