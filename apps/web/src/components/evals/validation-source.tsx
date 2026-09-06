import type { EvalSourceFile } from "@anpord/schema/domain/eval-source-files";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { CodeContent } from "@anpord/ui/components/ui/code-card";
import { CheckSquareIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { SetupSurface } from "./setup-surface";

export function ValidationSource({
  files,
}: {
  readonly files: readonly EvalSourceFile[];
}) {
  const id = useId();
  const [path, setPath] = useState(files[0]?.path);
  const selected = files.find((file) => file.path === path) ?? files[0];

  return (
    <SetupSurface
      contentClassName="p-0"
      Icon={CheckSquareIcon}
      title="Validation"
    >
      {selected === undefined ? (
        <p className="px-3.5 py-3 text-muted-foreground text-xs">
          Source unavailable for this run.
        </p>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-2 border-border-faint border-b px-3.5 py-2">
            {files.length > 1 ? (
              <>
                <label className="sr-only" htmlFor={id}>
                  Source file
                </label>
                <select
                  className="min-w-0 flex-1 bg-transparent font-mono text-muted-foreground text-xs"
                  id={id}
                  onChange={(event) => setPath(event.target.value)}
                  value={selected.path}
                >
                  {files.map((file) => (
                    <option key={file.path} value={file.path}>
                      {file.path}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground text-xs">
                {selected.path}
              </span>
            )}
            <CopyButton
              label={`Copy ${selected.path}`}
              size="inline"
              value={selected.content}
            />
          </div>
          <CodeContent
            code={selected.content}
            key={selected.path}
            lang="typescript"
          />
        </>
      )}
    </SetupSurface>
  );
}
