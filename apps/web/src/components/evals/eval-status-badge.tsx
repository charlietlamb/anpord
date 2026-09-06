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

const BADGE_BACKGROUNDS: Record<EvalTone, string> = {
  critical: "bg-destructive/15",
  neutral: "bg-muted",
  pending: "bg-warning/15",
  positive: "bg-success/15",
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

export function TrialBadge({
  ordinal,
  status,
}: {
  readonly ordinal: number;
  readonly status: EvalTrialStatus;
}) {
  const tone = trialTone(status);
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md font-medium font-mono text-xs tabular-nums",
        TONE_CLASSES[tone],
        BADGE_BACKGROUNDS[tone]
      )}
      title={`Trial ${ordinal}: ${status}`}
    >
      <span className="sr-only">Trial </span>
      {ordinal}
      <span className="sr-only">: {status}</span>
    </span>
  );
}
