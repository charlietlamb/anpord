import type {
  EvalArtifactMetadata,
  EvalArtifactRequest,
} from "@anpord/schema/domain/evals";
import { ArtifactFile } from "@/components/evals/artifact-file";
import { KindIcon } from "@/components/evals/kind-icon";
import { artifactFor } from "@/lib/evals/conversation";

export type TrialRef = Omit<EvalArtifactRequest, "path" | "sha256">;

export function ConversationWrote({
  artifacts,
  paths,
  trial,
}: {
  readonly artifacts: readonly EvalArtifactMetadata[];
  readonly paths: readonly string[];
  readonly trial: TrialRef;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {paths.map((path) => {
        const artifact = artifactFor(path, artifacts);

        return artifact === undefined ? (
          <li
            className="flex items-center gap-2 text-muted-foreground text-sm"
            key={path}
          >
            <KindIcon kind="fileChange" />
            <span className="shrink-0">Wrote</span>
            <span className="min-w-0 truncate font-mono text-foreground text-xs">
              {path}
            </span>
          </li>
        ) : (
          <li key={path}>
            <ArtifactFile
              artifact={artifact}
              className="rounded-lg bg-card"
              maxHeight="max-h-96"
              trial={trial}
            />
          </li>
        );
      })}
    </ul>
  );
}
