import { BrainIcon, CodeIcon, TerminalIcon } from "@phosphor-icons/react";
import { validationSummary } from "@sphynx/schema/domain/eval-validation-results";
import type { EvalValidation } from "@sphynx/schema/domain/eval-validations";
import { EvalStatusBadge } from "@sphynx/ui/components/evals/eval-status-badge";
import {
  DataTableChevron,
  DataTableRow,
} from "@sphynx/ui/components/ui/data-table";
import { seconds } from "@sphynx/ui/lib/evals/duration";
import { validationStatus } from "@sphynx/ui/lib/evals/eval-status";

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
    <DataTableRow render={<button onClick={onOpen} type="button" />}>
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
        <EvalStatusBadge status={validationStatus(validation.status)} />
      </span>

      <DataTableChevron />
    </DataTableRow>
  );
}
