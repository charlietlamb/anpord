import { validationSummary } from "@anpord/schema/domain/eval-validation-results";
import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import {
  BrainIcon,
  CaretRightIcon,
  CodeIcon,
  TerminalIcon,
} from "@phosphor-icons/react";
import { ValidationStatusPill } from "@/components/evals/eval-status-badge";
import { seconds } from "@/lib/evals/duration";

const KIND_ICONS = { code: CodeIcon, command: TerminalIcon, judge: BrainIcon };

export function CheckRow({
  onOpen,
  validation,
}: {
  readonly onOpen: () => void;
  readonly validation: EvalValidation;
}) {
  const Kind = KIND_ICONS[validation.kind];

  return (
    <DataTableRow
      className="w-full text-left"
      render={<button onClick={onOpen} type="button" />}
    >
      <span className="flex min-w-0 items-center gap-2.5 text-foreground">
        <Kind
          aria-label={validation.kind}
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="truncate">{validation.name}</span>
      </span>

      <span className="truncate text-muted-foreground">
        {validationSummary(validation)}
      </span>

      <span className="text-muted-foreground tabular-nums">
        {validation.durationMs === null ? null : seconds(validation.durationMs)}
      </span>

      <span>
        <ValidationStatusPill status={validation.status} />
      </span>

      <CaretRightIcon
        aria-hidden="true"
        className="size-3.5 text-muted-foreground"
      />
    </DataTableRow>
  );
}
