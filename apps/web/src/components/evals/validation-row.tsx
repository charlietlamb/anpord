import { validationSummary } from "@anpord/schema/domain/eval-validation-results";
import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { cn } from "@anpord/ui/lib/utils";
import {
  BrainIcon,
  CaretRightIcon,
  CodeIcon,
  TerminalIcon,
} from "@phosphor-icons/react";
import { PendingDot } from "@/components/evals/pending-dot";
import { SignalTip } from "@/components/evals/signal-tip";
import { ValidationDetail } from "@/components/evals/validation-detail";
import { seconds } from "@/lib/evals/duration";

const kindIcons = { code: CodeIcon, judge: BrainIcon, command: TerminalIcon };

export function ValidationRow({
  validation,
  expanded,
  onCollapse,
}: {
  readonly validation: EvalValidation;
  readonly expanded: boolean;
  readonly onCollapse?: () => void;
}) {
  const KindIcon = kindIcons[validation.kind];
  const failed =
    validation.status === "failed" || validation.status === "error";
  const pending =
    validation.status === "queued" || validation.status === "running";
  const judgment = validation.judgment;
  return (
    <details
      className="group/validation overflow-hidden rounded-xl border border-border-faint bg-muted/40 transition-colors hover:border-muted-foreground/40"
      onToggle={(event) => {
        if (!event.currentTarget.open) {
          onCollapse?.();
        }
      }}
      open={expanded}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-2.5 text-xs">
          <SignalTip label={validation.kind}>
            <KindIcon
              aria-label={validation.kind}
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              role="img"
            />
          </SignalTip>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="min-w-0 flex-1 basis-40 break-words font-medium font-mono text-xs">
              {validation.name}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {judgment?.score == null ? null : (
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  Score {judgment.score}
                </span>
              )}
              {validation.durationMs === null ? null : (
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {seconds(validation.durationMs)}
                </span>
              )}
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-muted-foreground",
                  failed && "bg-destructive/10 text-destructive",
                  validation.status === "passed" &&
                    "bg-success/10 text-success",
                  pending && "bg-warning/10 text-warning"
                )}
              >
                {pending ? <PendingDot /> : null}
                {validation.status}
              </span>
            </span>
          </div>
          <CaretRightIcon
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-open/validation:rotate-90"
          />
        </div>
        <p className="mt-2 line-clamp-2 pl-6.5 text-muted-foreground text-xs leading-relaxed group-open/validation:hidden">
          {validationSummary(validation)}
        </p>
      </summary>
      <div className="border-border-faint border-t bg-background/50 p-3">
        <ValidationDetail validation={validation} />
      </div>
    </details>
  );
}
