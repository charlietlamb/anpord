import type {
  EvalArtifactMetadata,
  EvalArtifactRequest,
} from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import {
  CaretRightIcon,
  CheckCircleIcon,
  MinusCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { FileSheet } from "@/components/evals/file-sheet";
import { FILES_TABLE } from "@/lib/evals/case-tables";
import { bytes } from "@/lib/evals/duration";
import { fileIcon } from "@/lib/evals/file-presentation";

export function TrialFiles({
  artifacts,
  changed,
  trial,
}: {
  readonly artifacts: readonly EvalArtifactMetadata[];
  readonly changed: readonly string[];
  readonly trial: Omit<EvalArtifactRequest, "sha256" | "path">;
}) {
  const [openPath, setOpenPath] = useState<string | null>(null);
  const captured = new Map(artifacts.map((file) => [file.path, file]));
  const paths = [
    ...new Set([...artifacts.map((file) => file.path), ...changed]),
  ];
  const open = openPath === null ? undefined : captured.get(openPath);

  return (
    <>
      <DataTable columns={FILES_TABLE.columns} label={FILES_TABLE.label}>
        <DataTableHead headings={FILES_TABLE.headings} />

        <DataTableBody>
          {paths.map((path) => {
            const file = captured.get(path);
            const Glyph = fileIcon(path);
            const cells = (
              <>
                <span className="flex min-w-0 items-center gap-2.5">
                  <Glyph
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="truncate font-mono text-xs">{path}</span>
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {file === undefined ? null : bytes(file.byteSize)}
                </span>
                <span>
                  {file === undefined ? (
                    <StatusBadge icon={MinusCircleIcon} tone="secondary">
                      Not captured
                    </StatusBadge>
                  ) : (
                    <StatusBadge icon={CheckCircleIcon} tone="positive">
                      Captured
                    </StatusBadge>
                  )}
                </span>
                {file === undefined ? (
                  <span />
                ) : (
                  <CaretRightIcon
                    aria-hidden="true"
                    className="size-3.5 text-muted-foreground"
                  />
                )}
              </>
            );

            return file === undefined ? (
              <DataTableRow key={path}>{cells}</DataTableRow>
            ) : (
              <DataTableRow
                className="w-full text-left"
                key={path}
                render={
                  <button onClick={() => setOpenPath(path)} type="button" />
                }
              >
                {cells}
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>

      <FileSheet file={open} onClose={() => setOpenPath(null)} trial={trial} />
    </>
  );
}
