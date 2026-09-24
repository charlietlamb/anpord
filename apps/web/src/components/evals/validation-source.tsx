import type { EvalSourceFile } from "@anpord/schema/domain/eval-source-files";
import { CodeCard } from "@anpord/ui/components/ui/code-card";
import { EmptyNote } from "@/components/layout/empty-note";
import { fileIcon } from "@/lib/evals/file-presentation";

export function ValidationSource({
  files,
}: {
  readonly files: readonly EvalSourceFile[];
}) {
  if (files.length === 0) {
    return <EmptyNote>Source unavailable for this run.</EmptyNote>;
  }

  return (
    <div className="flex flex-col gap-4">
      {files.map((file) => {
        const Glyph = fileIcon(file.path);

        return (
          <CodeCard
            code={file.content}
            icon={<Glyph aria-hidden className="size-4 shrink-0" />}
            key={file.path}
            label={file.path}
            lang="typescript"
            maxHeight=""
          />
        );
      })}
    </div>
  );
}
