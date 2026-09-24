import type {
  EvalArtifactMetadata,
  EvalArtifactRequest,
} from "@anpord/schema/domain/evals";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { CodeContent } from "@anpord/ui/components/ui/code-content";
import {
  CODE_FRAME_ACTION,
  CodeFrame,
} from "@anpord/ui/components/ui/code-frame";
import { useQuery } from "@tanstack/react-query";
import { ArtifactPending } from "@/components/evals/artifact-pending";
import { codeLanguage } from "@/lib/evals/code-language";
import { evalQueries } from "@/lib/evals/eval-queries";
import { fileIcon } from "@/lib/evals/file-presentation";

const PLAIN_ABOVE_BYTES = 32_768;

export function ArtifactFile({
  artifact,
  maxHeight = "",
  trial,
}: {
  readonly artifact: EvalArtifactMetadata;
  readonly maxHeight?: string;
  readonly trial: Omit<EvalArtifactRequest, "sha256" | "path">;
}) {
  const Glyph = fileIcon(artifact.path);
  const { data, isPending, refetch } = useQuery(
    evalQueries.artifact({
      ...trial,
      path: artifact.path,
      sha256: artifact.sha256,
    })
  );

  return (
    <CodeFrame
      actions={
        data === undefined ? null : (
          <CopyButton
            className={CODE_FRAME_ACTION}
            label={`Copy ${artifact.path}`}
            size="inline"
            value={data.content}
          />
        )
      }
      icon={<Glyph aria-hidden className="size-4 shrink-0" />}
      label={artifact.path}
    >
      {data === undefined ? (
        <ArtifactPending onRetry={() => refetch()} pending={isPending} />
      ) : (
        <CodeContent
          code={data.content}
          lang={
            artifact.byteSize > PLAIN_ABOVE_BYTES
              ? "text"
              : codeLanguage(artifact.path)
          }
          maxHeight={maxHeight}
        />
      )}
    </CodeFrame>
  );
}
