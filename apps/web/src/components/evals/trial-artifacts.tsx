import type {
  EvalArtifactMetadata,
  EvalArtifactRequest,
} from "@anpord/schema/domain/evals";
import { ArtifactFile } from "@/components/evals/artifact-file";
import { SetupSurface } from "./setup-surface";

export function TrialArtifacts({
  artifacts = [],
  title = "Generated files",
  titled = true,
  trial,
}: {
  readonly artifacts?: readonly EvalArtifactMetadata[];
  readonly title?: string;
  readonly titled?: boolean;
  readonly trial: Omit<EvalArtifactRequest, "sha256" | "path">;
}) {
  if (!artifacts.length) {
    return null;
  }
  return (
    <SetupSurface
      contentClassName="space-y-2"
      meta={String(artifacts.length)}
      title={title}
      titled={titled}
    >
      {artifacts.map((artifact) => (
        <ArtifactFile
          artifact={artifact}
          key={`${artifact.path}:${artifact.sha256}`}
          trial={trial}
        />
      ))}
    </SetupSurface>
  );
}
