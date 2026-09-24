import type { EvalArtifactMetadata } from "@anpord/schema/domain/evals";
import { ArtifactFile } from "@/components/evals/artifact-file";
import type { TrialRef } from "@/components/evals/conversation-wrote";
import { SideSheet } from "@/components/layout/side-sheet";

export function FileSheet({
  file,
  onClose,
  trial,
}: {
  readonly file: EvalArtifactMetadata | undefined;
  readonly onClose: () => void;
  readonly trial: TrialRef;
}) {
  return (
    <SideSheet
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={file !== undefined}
      title={file?.path}
    >
      {file === undefined ? null : (
        <div className="p-4">
          <ArtifactFile artifact={file} trial={trial} />
        </div>
      )}
    </SideSheet>
  );
}
