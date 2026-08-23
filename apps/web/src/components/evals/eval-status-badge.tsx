import type {
  EvalRunStatus,
  EvalTrialStatus,
} from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import type { Icon } from "@phosphor-icons/react";
import {
  type EvalTone,
  runGlyph,
  runTone,
  trialGlyph,
  trialTone,
} from "@/lib/evals/eval-status";

const TONE_CLASSES: Record<EvalTone, string> = {
  critical: "text-destructive",
  neutral: "text-muted-foreground",
  pending: "text-warning",
  positive: "text-success",
};

export function TrialStatusIcon({
  status,
}: {
  readonly status: EvalTrialStatus;
}) {
  const Glyph = trialGlyph(status);

  return (
    <Glyph
      className={cn("size-3.5 shrink-0", TONE_CLASSES[trialTone(status)])}
      weight="fill"
    />
  );
}

function StatusMark({
  detail,
  Glyph,
  label,
  tone,
}: {
  /** Why, for a state that has a reason. A run that failed says so in its
   * mark rather than in a second line under every failed row: the same
   * provider limit repeated down a list is one fact printed twenty times. */
  readonly detail?: string | null;
  readonly Glyph: Icon;
  readonly label: string;
  readonly tone: EvalTone;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="flex size-4 shrink-0 items-center justify-center">
            <Glyph
              aria-hidden="true"
              className={cn(
                "size-3.5",
                TONE_CLASSES[tone],
                label === "running" && "animate-spin motion-reduce:animate-none"
              )}
              weight={label === "running" ? "bold" : "fill"}
            />
            <span className="sr-only">{label}</span>
          </span>
        }
      />

      <TooltipContent className="max-w-sm" side="right">
        {detail === null || detail === undefined ? (
          label
        ) : (
          <span className="flex flex-col gap-1">
            <span>{label}</span>
            <span className="block whitespace-pre-wrap break-words opacity-70">
              {detail}
            </span>
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function RunStatusIcon({
  failure,
  status,
}: {
  readonly failure?: string | null;
  readonly status: EvalRunStatus;
}) {
  return (
    <StatusMark
      detail={failure}
      Glyph={runGlyph(status)}
      label={status}
      tone={runTone(status)}
    />
  );
}

export function TrialStatusMark({
  status,
}: {
  readonly status: EvalTrialStatus;
}) {
  return (
    <StatusMark
      Glyph={trialGlyph(status)}
      label={status}
      tone={trialTone(status)}
    />
  );
}
