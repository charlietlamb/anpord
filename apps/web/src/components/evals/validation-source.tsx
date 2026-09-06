import type { EvalSourceFile } from "@anpord/schema/domain/eval-source-files";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { CodeContent } from "@anpord/ui/components/ui/code-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";
import { CheckSquareIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { SetupSurface } from "./setup-surface";

export function ValidationSource({
  files,
}: {
  readonly files: readonly EvalSourceFile[];
}) {
  const [path, setPath] = useState<string | null>(null);
  const selected = files.find((file) => file.path === path) ?? files[0];

  return (
    <SetupSurface
      contentClassName="border-border-faint border-y"
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
              <Select onValueChange={setPath} value={selected.path}>
                <SelectTrigger
                  aria-label="Source file"
                  className="min-w-0 flex-1 font-mono text-xs"
                  size="sm"
                >
                  <SelectValue>{selected.path}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {files.map((file) => (
                    <SelectItem
                      className="font-mono"
                      key={file.path}
                      value={file.path}
                    >
                      {file.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
