import type { EvalArtifactMetadata } from "@anpord/schema/domain/evals";
import {
  DataTableChevron,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { CheckCircleIcon, MinusCircleIcon } from "@phosphor-icons/react";
import { bytes } from "@/lib/evals/duration";
import { fileIcon } from "@/lib/evals/file-presentation";

export function TrialFileRow({
  file,
  onOpen,
  path,
}: {
  readonly file: EvalArtifactMetadata | undefined;
  readonly onOpen: () => void;
  readonly path: string;
}) {
  const Glyph = fileIcon(path);
  const captured = file !== undefined;

  return (
    <DataTableRow
      render={captured ? <button onClick={onOpen} type="button" /> : undefined}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Glyph
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="truncate font-mono text-xs">{path}</span>
      </span>
      <span className="text-muted-foreground tabular-nums">
        {captured ? bytes(file.byteSize) : null}
      </span>
      <span>
        <StatusBadge
          icon={captured ? CheckCircleIcon : MinusCircleIcon}
          tone={captured ? "positive" : "secondary"}
        >
          {captured ? "Captured" : "Not captured"}
        </StatusBadge>
      </span>
      {captured ? <DataTableChevron /> : <span />}
    </DataTableRow>
  );
}
