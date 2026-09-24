import type {
  EvalArtifactMetadata,
  EvalArtifactRequest,
} from "@anpord/schema/domain/evals";
import { ArtifactFile } from "@/components/evals/artifact-file";
import { WroteLine } from "@/components/evals/wrote-line";
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
          <li key={path}>
            <WroteLine paths={[path]} />
          </li>
        ) : (
          <li key={path}>
            <ArtifactFile
              artifact={artifact}
              maxHeight="max-h-96"
              trial={trial}
            />
          </li>
        );
      })}
    </ul>
  );
}
