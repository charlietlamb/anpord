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
    <SideSheet onClose={onClose} open={file !== undefined} title={file?.path}>
      {file === undefined ? null : (
        <ArtifactFile artifact={file} trial={trial} />
      )}
    </SideSheet>
  );
}
