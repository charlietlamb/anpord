import type {
  EvalArtifactMetadata,
  EvalArtifactRequest,
} from "@anpord/schema/domain/evals";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { CodeContent } from "@anpord/ui/components/ui/code-card";
import type { CodeLanguage } from "@anpord/ui/lib/highlight";
import { CaretRightIcon, FileCodeIcon, FilesIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getArtifact } from "@/lib/evals/evals-client";
import { SetupSurface } from "./setup-surface";

const TYPESCRIPT = /\.[cm]?[jt]sx?$/;
const MARKDOWN = /\.mdx?$/;
const language = (path: string): CodeLanguage => {
  if (TYPESCRIPT.test(path)) {
    return "typescript";
  }
  if (path.endsWith(".json")) {
    return "json";
  }
  if (MARKDOWN.test(path)) {
    return "markdown";
  }
  if (path.endsWith(".sh")) {
    return "bash";
  }
  return "text";
};

function ArtifactFile({
  artifact,
  trial,
}: {
  readonly artifact: EvalArtifactMetadata;
  readonly trial: Omit<EvalArtifactRequest, "sha256">;
}) {
  const [open, setOpen] = useState(true);
  const { data, isPending, refetch } = useQuery({
    queryKey: [
      "artifact",
      trial.id,
      trial.cellKey,
      trial.ordinal,
      artifact.sha256,
    ],
    queryFn: () => getArtifact({ ...trial, sha256: artifact.sha256 }),
    enabled: open,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 300_000,
  });
  return (
    <div className="group/file overflow-hidden rounded-xl border border-border-faint bg-muted/40">
      <div className="flex min-w-0 items-center gap-2 px-2 py-1.5 shadow-[inset_0_-1px_0_0] shadow-border-faint">
        <button
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted/30"
          onClick={() => setOpen(!open)}
          type="button"
        >
          <CaretRightIcon
            aria-hidden
            className={`size-3 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
          <FileCodeIcon
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 flex-1 truncate font-mono">
            {artifact.path}
          </span>
        </button>
        {data ? (
          <CopyButton
            className="shrink-0 opacity-0 transition-opacity duration-150 ease-out focus-visible:opacity-100 group-hover/file:opacity-100"
            label={`Copy ${artifact.path}`}
            size="inline"
            value={data.content}
          />
        ) : null}
      </div>
      {open && data ? (
        <CodeContent
          code={data.content}
          lang={artifact.byteSize > 32_768 ? "text" : language(artifact.path)}
        />
      ) : null}
      {open && !data && isPending ? (
        <p className="px-4 py-5 text-muted-foreground text-xs">Loading file…</p>
      ) : null}
      {open && !data && !isPending ? (
        <button
          className="px-4 py-5 text-muted-foreground text-xs"
          onClick={() => refetch()}
          type="button"
        >
          Could not load file. Retry
        </button>
      ) : null}
    </div>
  );
}

export function TrialArtifacts({
  artifacts = [],
  trial,
}: {
  readonly artifacts?: readonly EvalArtifactMetadata[];
  readonly trial: Omit<EvalArtifactRequest, "sha256">;
}) {
  if (!artifacts.length) {
    return null;
  }
  return (
    <SetupSurface
      contentClassName="space-y-2"
      Icon={FilesIcon}
      meta={String(artifacts.length)}
      title="Generated files"
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
